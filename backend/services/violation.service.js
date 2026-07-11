const mongoose = require("mongoose");

const violationTypeService = require("./violationType.service");
const Violation = require("../models/Violation");
const Vehicle = require("../models/Vehicle");
const DrivingLicense = require("../models/DrivingLicense");
const Assignment = require("../models/Assignment");

const DriverAssignment = require("../models/DriverAssignment");
const BrtaDriverVehicleAuthorization = require("../models/BrtaDriverVehicleAuthorization");
const User = require("../models/User");

const BrtaOwner = require("../models/BrtaOwner");
const BrtaDriver = require("../models/BrtaDriver");
const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");

const AppError = require("../utils/AppError");
const generateCaseId = require("../utils/generateCaseId");
const { normalizePlate, normalizeLicense } = require("../utils/qr");

const brtaMockService = require("./brtaMock.service");
const brtaLicenseService = require("./brtaLicense.service");
const notificationService = require("./notification.service");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getApplicableToList = (violationType = {}) => {
  return Array.isArray(violationType.applicableTo)
    ? violationType.applicableTo.map((item) => String(item).toLowerCase())
    : [];
};

const normalizeResponsibility = (responsibility, selectedViolationType = {}) => {
  const requestedResponsibility = String(responsibility || "").toLowerCase();

  if (["owner", "driver", "both"].includes(requestedResponsibility)) {
    return requestedResponsibility;
  }

  const applicableTo = getApplicableToList(selectedViolationType);
  const appliesToDriver = applicableTo.includes("driver");
  const appliesToOwner = applicableTo.includes("owner");

  if (appliesToDriver && appliesToOwner) {
    return "both";
  }

  if (appliesToDriver) {
    return "driver";
  }

  if (appliesToOwner) {
    return "owner";
  }

  throw new AppError(
    "Selected violation does not have a valid applicable user type.",
    400
  );
};

const assertResponsibilityAllowed = (responsibility, selectedViolationType = {}) => {
  const applicableTo = getApplicableToList(selectedViolationType);

  if (responsibility === "driver" && !applicableTo.includes("driver")) {
    throw new AppError("Selected violation is not applicable to driver.", 400);
  }

  if (responsibility === "owner" && !applicableTo.includes("owner")) {
    throw new AppError("Selected violation is not applicable to owner.", 400);
  }

  if (
    responsibility === "both" &&
    (!applicableTo.includes("driver") || !applicableTo.includes("owner"))
  ) {
    throw new AppError(
      "Selected violation is not applicable to both driver and owner.",
      400
    );
  }
};

const findActiveAssignmentForVehicle = async ({
  appVehicle,
  registrationNumber,
  licenseNumber,
}) => {
  const vehicleQuery = [];
  const licenseQuery = [];

  if (appVehicle?._id) {
    vehicleQuery.push({ vehicle: appVehicle._id });
  }

  if (registrationNumber) {
    vehicleQuery.push({ registrationNumber });
    vehicleQuery.push({ vehicleRegistrationNumber: registrationNumber });
  }

  if (licenseNumber) {
    licenseQuery.push({ licenseNumber });
  }

  if (vehicleQuery.length === 0) {
    return null;
  }

  const query = {
    status: "active",
  };

  if (licenseQuery.length > 0) {
    query.$and = [{ $or: vehicleQuery }, { $or: licenseQuery }];
  } else {
    query.$or = vehicleQuery;
  }

  return Assignment.findOne(query)
    .populate("driver", "name email role phone nid brtaDriverId licenseNumber")
    .populate("license", "licenseNumber holderName licenseClass status driver nid")
    .lean();
};

const findLegacyAssignmentForVehicle = async ({ appVehicle }) => {
  if (!appVehicle?._id) {
    return null;
  }

  return DriverAssignment.findOne({
    vehicle: appVehicle._id,
    status: "active",
  })
    .populate("driver", "name email role phone nid brtaDriverId licenseNumber")
    .lean();
};

const findActiveBrtaAuthorization = async ({
  registrationNumber,
  licenseNumber,
}) => {
  if (!registrationNumber || !licenseNumber) {
    return null;
  }

  const now = new Date();

  return BrtaDriverVehicleAuthorization.findOne({
    registrationNumber,
    licenseNumber,
    status: "active",
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  }).lean();
};

const findDriverUserFromRegistry = async ({ licenseNumber, brtaLicense }) => {
  const query = [];

  if (licenseNumber) {
    query.push({ licenseNumber });
  }

  if (brtaLicense?.nid) {
    query.push({ nid: brtaLicense.nid });
  }

  if (brtaLicense?.brtaDriverId) {
    query.push({ brtaDriverId: brtaLicense.brtaDriverId });
  }

  if (query.length === 0) {
    return null;
  }

  return User.findOne({
    role: "driver",
    $or: query,
  })
    .select("_id")
    .lean();
};

const buildViolationQueryForRole = async (user) => {
  if (user.role === "admin") {
    return {};
  }

  if (user.role === "police") {
    return {
      officer: user._id,
    };
  }

  if (user.role === "driver") {
    const appLicenses = await DrivingLicense.find({
      driver: user._id,
    }).lean();

    const licenseIds = appLicenses.map((item) => item._id);
    const licenseNumbers = appLicenses
      .map((item) => item.licenseNumber)
      .filter(Boolean)
      .map(normalizeLicense);

    if (user.nid) {
      const brtaDriver = await BrtaDriver.findOne({
        nid: user.nid,
      }).lean();

      if (brtaDriver?.brtaDriverId) {
        const brtaLicenses = await BrtaDrivingLicense.find({
          brtaDriverId: brtaDriver.brtaDriverId,
        }).lean();

        for (const item of brtaLicenses) {
          if (item.licenseNumber) {
            licenseNumbers.push(normalizeLicense(item.licenseNumber));
          }
        }
      }
    }

    return {
      $or: [
        { driver: user._id },
        { license: { $in: licenseIds } },
        { licenseNumber: { $in: licenseNumbers } },
      ],
    };
  }

  if (user.role === "owner") {
    const appVehicles = await Vehicle.find({
      owner: user._id,
    }).lean();

    const vehicleIds = appVehicles.map((item) => item._id);
    const registrationNumbers = appVehicles
      .map((item) => item.registrationNumber)
      .filter(Boolean)
      .map(normalizePlate);

    if (user.nid) {
      const brtaOwner = await BrtaOwner.findOne({
        nid: user.nid,
      }).lean();

      if (brtaOwner?.brtaOwnerId) {
        const brtaVehicles = await BrtaVehicle.find({
          brtaOwnerId: brtaOwner.brtaOwnerId,
        }).lean();

        for (const item of brtaVehicles) {
          if (item.registrationNumber) {
            registrationNumbers.push(normalizePlate(item.registrationNumber));
          }
        }
      }
    }

    return {
      $or: [
        { vehicle: { $in: vehicleIds } },
        { registrationNumber: { $in: registrationNumbers } },
      ],
    };
  }

  return {
    _id: null,
  };
};

const normalizeStatusUpdate = (status) => {
  const value = String(status || "").toLowerCase();

  const allowed = ["pending", "approved", "dismissed", "paid", "unpaid"];

  if (!allowed.includes(value)) {
    throw new AppError(
      "Invalid status. Allowed: pending, approved, dismissed, paid, unpaid.",
      400
    );
  }

  return value;
};

const createViolation = async (payload, officer) => {
  const {
    vehicle,
    registrationNumber,
    driver,
    license,
    licenseNumber,
    violationType,
    violationTypeId,
    violationTypeRef,
    violationName,
    violationCode,
    responsibility,
    description,
    location,
    evidence,
  } = payload;

  if (
    !violationTypeId &&
    !violationTypeRef &&
    !violationCode &&
    !violationType &&
    !violationName
  ) {
    throw new AppError("Violation type is required.", 400);
  }

  const selectedViolationType = await violationTypeService.findViolationTypeForCase({
    id: violationTypeId || violationTypeRef,
    code: violationCode,
    name: violationName || violationType,
  });

  const finalResponsibility = normalizeResponsibility(
    responsibility,
    selectedViolationType
  );

  assertResponsibilityAllowed(finalResponsibility, selectedViolationType);

  const finalFineAmount = Number(
    selectedViolationType.fineAmount || selectedViolationType.fine || 0
  );

  if (!Number.isFinite(finalFineAmount) || finalFineAmount < 0) {
    throw new AppError("Selected violation has invalid fine amount.", 400);
  }

  const shouldLinkDriver =
    finalResponsibility === "driver" || finalResponsibility === "both";

  let appVehicle = null;
  let finalRegistrationNumber = registrationNumber
    ? normalizePlate(registrationNumber)
    : "";

  if (vehicle && isObjectId(vehicle)) {
    appVehicle = await Vehicle.findById(vehicle).lean();

    if (appVehicle?.registrationNumber) {
      finalRegistrationNumber = normalizePlate(appVehicle.registrationNumber);
    }
  }

  if (!appVehicle && finalRegistrationNumber) {
    appVehicle = await Vehicle.findOne({
      registrationNumber: finalRegistrationNumber,
    }).lean();
  }

  if (!finalRegistrationNumber) {
    throw new AppError("Vehicle registration number is required.", 400);
  }

  let appLicense = null;
  let finalLicenseNumber =
    shouldLinkDriver && licenseNumber ? normalizeLicense(licenseNumber) : "";

  if (license && isObjectId(license)) {
    appLicense = await DrivingLicense.findById(license).lean();

    if (appLicense?.licenseNumber) {
      finalLicenseNumber = normalizeLicense(appLicense.licenseNumber);
    }
  }

  if (!appLicense && finalLicenseNumber) {
    appLicense = await DrivingLicense.findOne({
      licenseNumber: finalLicenseNumber,
    }).lean();
  }

  let finalDriver = driver && isObjectId(driver) ? driver : null;

  if (!finalDriver && appLicense?.driver) {
    finalDriver = appLicense.driver;
  }

  let activeAssignment = null;
  let legacyAssignment = null;
  let brtaAuthorization = null;
  let brtaLicense = null;

  if (shouldLinkDriver) {
    activeAssignment = await findActiveAssignmentForVehicle({
      appVehicle,
      registrationNumber: finalRegistrationNumber,
      licenseNumber: finalLicenseNumber,
    });

    if (activeAssignment) {
      const assignmentDriver =
        activeAssignment.driver && typeof activeAssignment.driver === "object"
          ? activeAssignment.driver._id
          : activeAssignment.driver;

      if (!finalDriver && assignmentDriver) {
        finalDriver = assignmentDriver;
      }

      if (!appLicense && activeAssignment.license) {
        if (typeof activeAssignment.license === "object") {
          appLicense = activeAssignment.license;
          finalLicenseNumber = normalizeLicense(
            activeAssignment.license.licenseNumber ||
            activeAssignment.licenseNumber ||
            ""
          );
        } else if (isObjectId(activeAssignment.license)) {
          appLicense = await DrivingLicense.findById(activeAssignment.license).lean();

          if (appLicense?.licenseNumber) {
            finalLicenseNumber = normalizeLicense(appLicense.licenseNumber);
          }
        }
      }

      if (!finalLicenseNumber && activeAssignment.licenseNumber) {
        finalLicenseNumber = normalizeLicense(activeAssignment.licenseNumber);
      }

      if (!appLicense && finalLicenseNumber) {
        appLicense = await DrivingLicense.findOne({
          licenseNumber: finalLicenseNumber,
        }).lean();
      }
    }

    if (!activeAssignment) {
      legacyAssignment = await findLegacyAssignmentForVehicle({ appVehicle });

      if (legacyAssignment?.driver) {
        const legacyDriver =
          typeof legacyAssignment.driver === "object"
            ? legacyAssignment.driver
            : null;

        if (!finalDriver) {
          finalDriver = legacyDriver?._id || legacyAssignment.driver;
        }

        if (!finalLicenseNumber && legacyDriver?.licenseNumber) {
          finalLicenseNumber = normalizeLicense(legacyDriver.licenseNumber);
        }
      }
    }

    if (!appLicense && finalLicenseNumber) {
      appLicense = await DrivingLicense.findOne({
        licenseNumber: finalLicenseNumber,
      }).lean();
    }

    if (!finalDriver && appLicense?.driver) {
      finalDriver = appLicense.driver;
    }

    if (finalLicenseNumber) {
      brtaLicense = await BrtaDrivingLicense.findOne({
        licenseNumber: finalLicenseNumber,
      }).lean();

      brtaAuthorization = await findActiveBrtaAuthorization({
        registrationNumber: finalRegistrationNumber,
        licenseNumber: finalLicenseNumber,
      });
    }

    if (!finalDriver && brtaLicense) {
      const linkedDriverUser = await findDriverUserFromRegistry({
        licenseNumber: finalLicenseNumber,
        brtaLicense,
      });

      if (linkedDriverUser?._id) {
        finalDriver = linkedDriverUser._id;
      }
    }
  }

  if (shouldLinkDriver && !finalLicenseNumber) {
    throw new AppError(
      "Driver-linked violation requires a driver license number or an active vehicle assignment.",
      400
    );
  }

  if (shouldLinkDriver) {
    const hasDriverEvidence = Boolean(
      finalDriver ||
      appLicense?._id ||
      brtaLicense?._id ||
      activeAssignment?._id ||
      legacyAssignment?._id ||
      brtaAuthorization?._id
    );

    if (!hasDriverEvidence) {
      throw new AppError(
        "Driver-linked violation requires a valid driver license, registered driver, or active assignment/authorization.",
        400
      );
    }
  }

  const caseId = await generateCaseId();

  let vehicleVerification = null;
  let licenseVerification = null;

  try {
    vehicleVerification = await brtaMockService.verifyVehicle({
      registrationNumber: finalRegistrationNumber,
      licenseNumber: finalLicenseNumber,
    });
  } catch (_) {
    vehicleVerification = null;
  }

  try {
    if (finalLicenseNumber) {
      licenseVerification = await brtaLicenseService.verifyLicense({
        licenseNumber: finalLicenseNumber,
      });
    }
  } catch (_) {
    licenseVerification = null;
  }

  const safetySnapshot = {
    vehicleScore:
      vehicleVerification?.safetyScore ??
      vehicleVerification?.verification?.safetyScore ??
      null,

    driverScore:
      licenseVerification?.safetyScore ??
      licenseVerification?.verification?.safetyScore ??
      null,

    riskLevel:
      vehicleVerification?.riskLevel ||
      licenseVerification?.riskLevel ||
      vehicleVerification?.verification?.riskLevel ||
      licenseVerification?.verification?.riskLevel ||
      "Unknown Risk",

    issues: [
      ...(vehicleVerification?.issues ||
        vehicleVerification?.verification?.issues ||
        []),
      ...(licenseVerification?.issues ||
        licenseVerification?.verification?.issues ||
        []),
    ],
  };

  const violation = await Violation.create({
    caseId,

    vehicle: appVehicle?._id || undefined,
    registrationNumber: finalRegistrationNumber,

    driver: finalDriver || undefined,

    license: appLicense?._id || undefined,
    licenseNumber: finalLicenseNumber || undefined,

    officer: officer._id,

    violationTypeRef: selectedViolationType._id || selectedViolationType.id,
    violationType: selectedViolationType.name,
    violationCode: selectedViolationType.code,

    violationSnapshot: {
      code: selectedViolationType.code,
      name: selectedViolationType.name,
      description: selectedViolationType.description || "",
      fineAmount: finalFineAmount,
      severity: selectedViolationType.severity || "medium",
      points: Number(selectedViolationType.points || 0),
      applicableTo: selectedViolationType.applicableTo || [],
    },

    responsibility: finalResponsibility,
    description:
      description ||
      selectedViolationType.description ||
      selectedViolationType.name,

    fineAmount: finalFineAmount,
    currency: "BDT",

    location: location || {},
    evidence: Array.isArray(evidence) ? evidence : [],

    status: "pending",
    paymentStatus: "unpaid",

    safetySnapshot,
    issuedAt: new Date(),
  });

  notificationService.dispatchNotificationTask(
    notificationService.notifyEChallanCreated(violation),
    "create e-challan notification"
  );

  return violation;
};

const getViolations = async ({ user, filters = {} }) => {
  const roleQuery = await buildViolationQueryForRole(user);

  const query = {
    ...roleQuery,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.registrationNumber) {
    query.registrationNumber = normalizePlate(filters.registrationNumber);
  }

  if (filters.licenseNumber) {
    query.licenseNumber = normalizeLicense(filters.licenseNumber);
  }

  const violations = await Violation.find(query)
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .populate("adminReviewedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return violations;
};

const getViolationById = async (id, user) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid violation id.", 400);
  }

  const roleQuery = await buildViolationQueryForRole(user);

  const violation = await Violation.findOne({
    _id: id,
    ...roleQuery,
  })
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .populate("adminReviewedBy", "name email")
    .lean();

  if (!violation) {
    throw new AppError("Violation not found.", 404);
  }

  return violation;
};

const updateViolationStatus = async ({ id, status, note, admin }) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid violation id.", 400);
  }

  const user = admin;
  const normalizedStatus = normalizeStatusUpdate(status);

  if (!user) {
    throw new AppError("Unauthorized. Please login first.", 401);
  }

  if (user.role === "admin" && ["paid", "unpaid"].includes(normalizedStatus)) {
    throw new AppError(
      "Admin cannot directly change payment status. Payment must be completed by driver or owner.",
      403
    );
  }

  // Driver/Owner payment simulation:
  // Driver/Owner can ONLY mark their own accessible violation as paid.
  // They cannot approve, dismiss, or change review status.
  if (user.role !== "admin") {
    if (!["driver", "owner"].includes(user.role)) {
      throw new AppError("Only admin, driver, or owner can update payment.", 403);
    }

    if (normalizedStatus !== "paid") {
      throw new AppError(
        "Only admin can approve, dismiss, or review cases. Driver/Owner can only pay fines.",
        403
      );
    }

    const roleQuery = await buildViolationQueryForRole(user);

    const existingViolation = await Violation.findOne({
      _id: id,
      ...roleQuery,
    }).lean();

    if (!existingViolation) {
      throw new AppError("Violation not found or payment not allowed.", 404);
    }

    if (
      existingViolation.status === "dismissed" ||
      existingViolation.paymentStatus === "waived"
    ) {
      throw new AppError("Dismissed or waived case cannot be paid.", 400);
    }

    if (existingViolation.status === "pending") {
      throw new AppError("Pending case must be approved before payment.", 400);
    }

    if (
      existingViolation.status === "paid" ||
      existingViolation.paymentStatus === "paid" ||
      existingViolation.paidAt ||
      existingViolation.paymentDate
    ) {
      throw new AppError("Violation is already paid.", 409);
    }

    const violation = await Violation.findByIdAndUpdate(
      id,
      {
        status: "paid",
        paymentStatus: "paid",
        paymentDate: new Date(),
        paidAt: new Date(),
      },
      {
        returnDocument: "after",
      }
    )
      .populate("vehicle", "registrationNumber brand model color vehicleType")
      .populate("driver", "name email role phone")
      .populate("license", "licenseNumber holderName licenseClass status")
      .populate("officer", "name email badge station")
      .populate("adminReviewedBy", "name email");

    if (!violation) {
      throw new AppError("Violation not found.", 404);
    }

    notificationService.dispatchNotificationTask(
      notificationService.notifyViolationPaid(violation, { paidBy: user }),
      "violation payment notification"
    );

    return violation;
  }

  // Admin review/status update
  const update = {
    status: normalizedStatus,
    adminReviewedBy: user._id,
    adminReviewNote: note || "",
    reviewNote: note || "",
    reviewedAt: new Date(),
    adminReviewedAt: new Date(),
  };

  if (normalizedStatus === "paid") {
    update.paymentStatus = "paid";
    update.paymentDate = new Date();
    update.paidAt = new Date();
  }

  if (normalizedStatus === "dismissed") {
    update.paymentStatus = "waived";
  }

  const violation = await Violation.findByIdAndUpdate(id, update, {
    returnDocument: "after",
  })
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .populate("adminReviewedBy", "name email");

  if (!violation) {
    throw new AppError("Violation not found.", 404);
  }

  notificationService.dispatchNotificationTask(
    notificationService.notifyEChallanReviewed(violation, {
      status: normalizedStatus,
      admin: user,
    }),
    "e-challan review notification"
  );

  return violation;
};

const getVehicleViolations = async (registrationNumberOrId, user) => {
  let plate = "";
  let appVehicle = null;

  if (isObjectId(registrationNumberOrId)) {
    appVehicle = await Vehicle.findById(registrationNumberOrId).lean();

    if (appVehicle?.registrationNumber) {
      plate = normalizePlate(appVehicle.registrationNumber);
    }
  } else {
    plate = normalizePlate(registrationNumberOrId);

    appVehicle = await Vehicle.findOne({
      registrationNumber: plate,
    }).lean();
  }

  const roleQuery = await buildViolationQueryForRole(user);

  const orQuery = [];

  if (plate) {
    orQuery.push({ registrationNumber: plate });
  }

  if (appVehicle?._id) {
    orQuery.push({ vehicle: appVehicle._id });
  }

  if (orQuery.length === 0) {
    return [];
  }

  const violations = await Violation.find({
    ...roleQuery,
    $or: orQuery,
  })
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .sort({ createdAt: -1 })
    .lean();

  return violations;
};
module.exports = {
  createViolation,
  getViolations,
  getViolationById,
  updateViolationStatus,
  getVehicleViolations,
};