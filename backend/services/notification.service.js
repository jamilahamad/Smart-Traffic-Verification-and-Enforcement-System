const Notification = require("../models/Notification");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const DrivingLicense = require("../models/DrivingLicense");
const Violation = require("../models/Violation");
const Assignment = require("../models/Assignment");
const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaOwner = require("../models/BrtaOwner");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const { emitNotificationToUser } = require("./realtime.service");
const { normalizePlate, normalizeLicense } = require("../utils/qr");

const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value._id || value.id || value || "");
};

const addRecipient = (set, value) => {
    const id = getId(value);

    if (id) {
        set.add(id);
    }
};

const dispatchNotificationTask = (task, label = "notification") => {
    Promise.resolve(task).catch((error) => {
        console.error(`${label} failed:`, error.message);
    });
};

const createNotification = async ({
    recipient,
    type = "system",
    title,
    message,
    severity = "info",
    link = "",
    metadata = {},
    dedupeKey,
}) => {
    const recipientId = getId(recipient);

    if (!recipientId || !title || !message) {
        return null;
    }

    if (dedupeKey) {
        const existingNotification = await Notification.findOne({ dedupeKey }).lean();

        if (existingNotification) {
            return existingNotification;
        }
    }

    try {
        const notification = await Notification.create({
            recipient: recipientId,
            type,
            title,
            message,
            severity,
            link,
            metadata,
            dedupeKey,
        });

        emitNotificationToUser(notification);

        return notification;
    } catch (error) {
        if (error?.code === 11000 && dedupeKey) {
            return Notification.findOne({ dedupeKey }).lean();
        }

        throw error;
    }
};

const createNotificationsForRecipients = async (recipients = [], payload = {}) => {
    const uniqueRecipients = Array.from(
        new Set(recipients.map((recipient) => getId(recipient)).filter(Boolean))
    );

    const tasks = uniqueRecipients.map((recipientId) =>
        createNotification({
            ...payload,
            recipient: recipientId,
            dedupeKey: payload.dedupeKey
                ? `${payload.dedupeKey}:recipient:${recipientId}`
                : undefined,
        })
    );

    return Promise.all(tasks);
};

const getActiveAdmins = async () => {
    return User.find({
        role: "admin",
        status: "active",
    })
        .select("_id name email role")
        .lean();
};

const hydrateViolation = async (violation) => {
    const violationId = getId(violation);

    if (!violationId) {
        return violation;
    }

    return Violation.findById(violationId)
        .populate("vehicle", "registrationNumber plateNumber brand model owner")
        .populate("driver", "name email role phone nid brtaDriverId licenseNumber")
        .populate("license", "licenseNumber holderName licenseClass status driver nid brtaDriverId")
        .populate("officer", "name email role badge station")
        .populate("adminReviewedBy", "name email role")
        .lean();
};

const getViolationPlate = (violation = {}) => {
    return (
        violation.registrationNumber ||
        violation.plateNumber ||
        violation.vehicle?.registrationNumber ||
        violation.vehicle?.plateNumber ||
        "Unknown vehicle"
    );
};

const getViolationTitle = (violation = {}) => {
    return (
        violation.violationType ||
        violation.violationLabel ||
        violation.violationSnapshot?.name ||
        violation.description ||
        "Traffic violation"
    );
};

const getViolationResponsibility = (violation = {}) => {
    const saved = String(violation.responsibility || "").toLowerCase();

    if (["driver", "owner", "both"].includes(saved)) {
        return saved;
    }

    const applicableTo = Array.isArray(violation.violationSnapshot?.applicableTo)
        ? violation.violationSnapshot.applicableTo.map((item) => String(item).toLowerCase())
        : [];

    const appliesDriver = applicableTo.includes("driver");
    const appliesOwner = applicableTo.includes("owner");

    if (appliesDriver && appliesOwner) return "both";
    if (appliesDriver) return "driver";
    if (appliesOwner) return "owner";

    return "owner";
};

const resolveDriverRecipientsForViolation = async (violation = {}) => {
    const recipients = new Set();

    addRecipient(recipients, violation.driver);

    if (violation.license?.driver) {
        addRecipient(recipients, violation.license.driver);
    }

    const licenseNumber = normalizeLicense(
        violation.licenseNumber || violation.license?.licenseNumber || ""
    );

    if (licenseNumber) {
        const appLicense = await DrivingLicense.findOne({ licenseNumber }).lean();

        if (appLicense?.driver) {
            addRecipient(recipients, appLicense.driver);
        }

        const brtaLicense = await BrtaDrivingLicense.findOne({ licenseNumber }).lean();

        if (brtaLicense) {
            const query = [];

            if (brtaLicense.nid) query.push({ nid: brtaLicense.nid });
            if (brtaLicense.brtaDriverId) query.push({ brtaDriverId: brtaLicense.brtaDriverId });
            if (brtaLicense.licenseNumber) query.push({ licenseNumber: brtaLicense.licenseNumber });

            if (query.length > 0) {
                const user = await User.findOne({
                    role: "driver",
                    $or: query,
                })
                    .select("_id")
                    .lean();

                addRecipient(recipients, user);
            }
        }
    }

    return Array.from(recipients);
};

const resolveOwnerRecipientsForViolation = async (violation = {}) => {
    const recipients = new Set();

    if (violation.vehicle?.owner) {
        addRecipient(recipients, violation.vehicle.owner);
    }

    const registrationNumber = normalizePlate(getViolationPlate(violation));

    if (registrationNumber) {
        const appVehicle = await Vehicle.findOne({ registrationNumber }).lean();

        if (appVehicle?.owner) {
            addRecipient(recipients, appVehicle.owner);
        }

        const brtaVehicle = await BrtaVehicle.findOne({ registrationNumber }).lean();

        if (brtaVehicle?.brtaOwnerId) {
            const brtaOwner = await BrtaOwner.findOne({
                brtaOwnerId: brtaVehicle.brtaOwnerId,
            }).lean();

            if (brtaOwner) {
                const query = [];

                if (brtaOwner.nid) query.push({ nid: brtaOwner.nid });
                if (brtaOwner.brtaOwnerId) query.push({ brtaOwnerId: brtaOwner.brtaOwnerId });

                if (query.length > 0) {
                    const user = await User.findOne({
                        role: "owner",
                        $or: query,
                    })
                        .select("_id")
                        .lean();

                    addRecipient(recipients, user);
                }
            }
        }
    }

    return Array.from(recipients);
};

const resolveViolationRecipients = async (violation) => {
    const cleanViolation = await hydrateViolation(violation);
    const responsibility = getViolationResponsibility(cleanViolation);

    const [admins, driverRecipients, ownerRecipients] = await Promise.all([
        getActiveAdmins(),
        responsibility === "driver" || responsibility === "both"
            ? resolveDriverRecipientsForViolation(cleanViolation)
            : [],
        responsibility === "owner" || responsibility === "both"
            ? resolveOwnerRecipientsForViolation(cleanViolation)
            : [],
    ]);

    return {
        violation: cleanViolation,
        responsibility,
        adminRecipients: admins.map((admin) => getId(admin)).filter(Boolean),
        driverRecipients,
        ownerRecipients,
        officerRecipients: [getId(cleanViolation?.officer)].filter(Boolean),
    };
};

const notifyEChallanCreated = async (violation) => {
    const {
        violation: cleanViolation,
        driverRecipients,
        ownerRecipients,
        adminRecipients,
    } = await resolveViolationRecipients(violation);

    if (!cleanViolation) return [];

    const violationId = getId(cleanViolation);
    const caseId = cleanViolation.caseId || "E-Challan";
    const plate = getViolationPlate(cleanViolation);
    const violationTitle = getViolationTitle(cleanViolation);
    const officerName = cleanViolation.officer?.name || "Traffic police";

    return Promise.all([
        createNotificationsForRecipients(adminRecipients, {
            type: "case_created",
            title: "New E-Challan Pending Review",
            message: `${caseId} was created by ${officerName} for ${plate}. ${violationTitle} is waiting for admin review.`,
            severity: "warning",
            link: "all-cases",
            metadata: {
                violation: violationId,
                registrationNumber: plate,
            },
            dedupeKey: `case-created:${violationId}:admin`,
        }),

        createNotificationsForRecipients(driverRecipients, {
            type: "case_created",
            title: "New Driver Violation Issued",
            message: `${caseId} has been issued for ${violationTitle}. It is waiting for admin review.`,
            severity: "warning",
            link: "my-violations",
            metadata: {
                violation: violationId,
                registrationNumber: plate,
                licenseNumber: cleanViolation.licenseNumber,
            },
            dedupeKey: `case-created:${violationId}:driver`,
        }),

        createNotificationsForRecipients(ownerRecipients, {
            type: "case_created",
            title: "New Vehicle Violation Issued",
            message: `${caseId} has been issued for vehicle ${plate}. It is waiting for admin review.`,
            severity: "warning",
            link: "owner-violations",
            metadata: {
                violation: violationId,
                registrationNumber: plate,
            },
            dedupeKey: `case-created:${violationId}:owner`,
        }),
    ]);
};

const notifyEChallanReviewed = async (violation, { status, admin } = {}) => {
    const {
        violation: cleanViolation,
        driverRecipients,
        ownerRecipients,
        officerRecipients,
    } = await resolveViolationRecipients(violation);

    if (!cleanViolation) return [];

    const normalizedStatus = String(status || cleanViolation.status || "").toLowerCase();

    if (!["approved", "dismissed"].includes(normalizedStatus)) {
        return [];
    }

    const violationId = getId(cleanViolation);
    const caseId = cleanViolation.caseId || "E-Challan";
    const plate = getViolationPlate(cleanViolation);
    const reviewerName = admin?.name || cleanViolation.adminReviewedBy?.name || "Admin";

    const isApproved = normalizedStatus === "approved";
    const statusLabel = isApproved ? "approved" : "dismissed";
    const severity = isApproved ? "critical" : "success";

    const citizenTitle = isApproved
        ? "E-Challan Approved - Fine Payable"
        : "E-Challan Dismissed";

    const citizenMessage = isApproved
        ? `${caseId} for ${plate} has been approved. Please review and pay the fine.`
        : `${caseId} for ${plate} has been dismissed. No payment is required.`;

    return Promise.all([
        createNotificationsForRecipients(officerRecipients, {
            type: "case_reviewed",
            title: `E-Challan ${statusLabel}`,
            message: `${caseId} for ${plate} was ${statusLabel} by ${reviewerName}.`,
            severity,
            link: "my-cases",
            metadata: {
                violation: violationId,
                registrationNumber: plate,
            },
            dedupeKey: `case-reviewed:${violationId}:${normalizedStatus}:officer`,
        }),

        createNotificationsForRecipients(driverRecipients, {
            type: "case_reviewed",
            title: citizenTitle,
            message: citizenMessage,
            severity,
            link: "my-violations",
            metadata: {
                violation: violationId,
                registrationNumber: plate,
                licenseNumber: cleanViolation.licenseNumber,
            },
            dedupeKey: `case-reviewed:${violationId}:${normalizedStatus}:driver`,
        }),

        createNotificationsForRecipients(ownerRecipients, {
            type: "case_reviewed",
            title: citizenTitle,
            message: citizenMessage,
            severity,
            link: "owner-violations",
            metadata: {
                violation: violationId,
                registrationNumber: plate,
            },
            dedupeKey: `case-reviewed:${violationId}:${normalizedStatus}:owner`,
        }),
    ]);
};

const notifyViolationPaid = async (violation, { paidBy } = {}) => {
    const {
        violation: cleanViolation,
        adminRecipients,
        officerRecipients,
    } = await resolveViolationRecipients(violation);

    if (!cleanViolation) return [];

    const violationId = getId(cleanViolation);
    const caseId = cleanViolation.caseId || "E-Challan";
    const plate = getViolationPlate(cleanViolation);
    const payerName = paidBy?.name || "User";
    const payerRole = String(paidBy?.role || "user");

    const staffRecipients = Array.from(new Set([...adminRecipients, ...officerRecipients]));
    const payerLink = payerRole === "owner" ? "owner-violations" : "my-violations";

    return Promise.all([
        createNotificationsForRecipients(staffRecipients, {
            type: "payment_completed",
            title: "Fine Payment Completed",
            message: `${payerName} paid the fine for ${caseId} - ${plate}.`,
            severity: "success",
            link: "all-cases",
            metadata: {
                violation: violationId,
                registrationNumber: plate,
            },
            dedupeKey: `payment-completed:${violationId}:staff`,
        }),

        createNotification({
            recipient: paidBy?._id,
            type: "payment_completed",
            title: "Payment Successful",
            message: `Your payment for ${caseId} has been recorded successfully.`,
            severity: "success",
            link: payerLink,
            metadata: {
                violation: violationId,
                registrationNumber: plate,
            },
            dedupeKey: `payment-completed:${violationId}:payer:${getId(paidBy)}`,
        }),
    ]);
};

const hydrateAssignment = async (assignment) => {
    const assignmentId = getId(assignment);

    if (!assignmentId) {
        return assignment;
    }

    return Assignment.findById(assignmentId)
        .populate("vehicle", "registrationNumber brand model color vehicleType owner")
        .populate("driver", "name email role phone nid licenseNumber")
        .populate("owner", "name email role phone nid")
        .populate("assignedBy", "name email role")
        .populate("requestedBy", "name email role")
        .lean();
};

const getAssignmentPlate = (assignment = {}) => {
    return (
        assignment.registrationNumber ||
        assignment.vehicle?.registrationNumber ||
        assignment.vehicle?.plateNumber ||
        "Unknown vehicle"
    );
};

const notifyAssignmentCreated = async (assignment, { createdBy } = {}) => {
    const cleanAssignment = await hydrateAssignment(assignment);

    if (!cleanAssignment) return [];

    const assignmentId = getId(cleanAssignment);
    const plate = getAssignmentPlate(cleanAssignment);
    const ownerName = createdBy?.name || cleanAssignment.owner?.name || "Vehicle owner";
    const driverId = getId(cleanAssignment.driver);
    const ownerId = getId(cleanAssignment.owner) || getId(cleanAssignment.vehicle?.owner);

    if (cleanAssignment.status === "pending_driver_approval" && driverId) {
        return createNotification({
            recipient: driverId,
            type: "assignment_request",
            title: "New Vehicle Assignment Request",
            message: `${ownerName} requested to assign vehicle ${plate} to you. Please accept or reject the request.`,
            severity: "info",
            link: "my-license",
            metadata: {
                assignment: assignmentId,
                registrationNumber: plate,
                licenseNumber: cleanAssignment.licenseNumber,
            },
            dedupeKey: `assignment-request:${assignmentId}:driver:${driverId}`,
        });
    }

    if (cleanAssignment.status === "active") {
        return Promise.all([
            createNotification({
                recipient: driverId,
                type: "assignment_activated",
                title: "Vehicle Assignment Activated",
                message: `Vehicle ${plate} has been assigned to you.`,
                severity: "success",
                link: "my-license",
                metadata: {
                    assignment: assignmentId,
                    registrationNumber: plate,
                    licenseNumber: cleanAssignment.licenseNumber,
                },
                dedupeKey: `assignment-active:${assignmentId}:driver:${driverId}`,
            }),

            createNotification({
                recipient: ownerId,
                type: "assignment_activated",
                title: "Vehicle Assignment Activated",
                message: `Vehicle ${plate} assignment is now active.`,
                severity: "success",
                link: "assign-drivers",
                metadata: {
                    assignment: assignmentId,
                    registrationNumber: plate,
                    licenseNumber: cleanAssignment.licenseNumber,
                },
                dedupeKey: `assignment-active:${assignmentId}:owner:${ownerId}`,
            }),
        ]);
    }

    return [];
};

const notifyAssignmentResponded = async (assignment, { driver, action } = {}) => {
    const cleanAssignment = await hydrateAssignment(assignment);

    if (!cleanAssignment) return [];

    const assignmentId = getId(cleanAssignment);
    const plate = getAssignmentPlate(cleanAssignment);
    const accepted = String(action || "").toLowerCase() === "accept" || cleanAssignment.status === "active";
    const ownerId = getId(cleanAssignment.owner) || getId(cleanAssignment.vehicle?.owner);
    const driverName = driver?.name || cleanAssignment.driver?.name || "Driver";

    if (!ownerId) {
        return [];
    }

    return createNotification({
        recipient: ownerId,
        type: accepted ? "assignment_accepted" : "assignment_rejected",
        title: accepted ? "Driver Accepted Assignment" : "Driver Rejected Assignment",
        message: accepted
            ? `${driverName} accepted the assignment request for vehicle ${plate}.`
            : `${driverName} rejected the assignment request for vehicle ${plate}.`,
        severity: accepted ? "success" : "warning",
        link: "assign-drivers",
        metadata: {
            assignment: assignmentId,
            registrationNumber: plate,
            licenseNumber: cleanAssignment.licenseNumber,
        },
        dedupeKey: `assignment-response:${assignmentId}:${accepted ? "accepted" : "rejected"}:owner:${ownerId}`,
    });
};

const notifyAssignmentRemoved = async (assignment, { removedBy } = {}) => {
    const cleanAssignment = await hydrateAssignment(assignment);

    if (!cleanAssignment) return [];

    const assignmentId = getId(cleanAssignment);
    const plate = getAssignmentPlate(cleanAssignment);
    const driverId = getId(cleanAssignment.driver);
    const ownerId = getId(cleanAssignment.owner) || getId(cleanAssignment.vehicle?.owner);
    const removerId = getId(removedBy);
    const removerName = removedBy?.name || "User";

    return Promise.all([
        driverId && driverId !== removerId
            ? createNotification({
                recipient: driverId,
                type: "assignment_removed",
                title: "Vehicle Assignment Removed",
                message: `Your assignment for vehicle ${plate} was removed by ${removerName}.`,
                severity: "warning",
                link: "my-license",
                metadata: {
                    assignment: assignmentId,
                    registrationNumber: plate,
                    licenseNumber: cleanAssignment.licenseNumber,
                },
                dedupeKey: `assignment-removed:${assignmentId}:driver:${driverId}`,
            })
            : null,

        ownerId && ownerId !== removerId
            ? createNotification({
                recipient: ownerId,
                type: "assignment_removed",
                title: "Vehicle Assignment Removed",
                message: `Assignment for vehicle ${plate} was removed by ${removerName}.`,
                severity: "warning",
                link: "assign-drivers",
                metadata: {
                    assignment: assignmentId,
                    registrationNumber: plate,
                    licenseNumber: cleanAssignment.licenseNumber,
                },
                dedupeKey: `assignment-removed:${assignmentId}:owner:${ownerId}`,
            })
            : null,
    ]);
};

module.exports = {
    createNotification,
    createNotificationsForRecipients,
    notifyEChallanCreated,
    notifyEChallanReviewed,
    notifyViolationPaid,
    notifyAssignmentCreated,
    notifyAssignmentResponded,
    notifyAssignmentRemoved,
    dispatchNotificationTask,
};