const mongoose = require("mongoose");

const Assignment = require("../models/Assignment");
const DriverAssignment = require("../models/DriverAssignment");
const Vehicle = require("../models/Vehicle");
const DrivingLicense = require("../models/DrivingLicense");
const User = require("../models/User");

const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaOwner = require("../models/BrtaOwner");
const BrtaDriver = require("../models/BrtaDriver");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaDriverVehicleAuthorization = require("../models/BrtaDriverVehicleAuthorization");

const AppError = require("../utils/AppError");
const { normalizePlate, normalizeLicense } = require("../utils/qr");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const populateAssignment = (query) => {
  return query
    .populate("vehicle", "registrationNumber brand model color vehicleType owner")
    .populate("driver", "name email role phone nid avatar avatarUrl photo photoUrl image profileImage profilePhoto profilePicture cloudinaryUrl cloudinarySecureUrl picture")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("owner", "name email role phone nid")
    .populate("assignedBy", "name email role")
    .populate("requestedBy", "name email role")
    .populate("removeInfo.removedBy", "name email role");
};


const populateLegacyDriverAssignment = (query) => {
  return query
    .populate("vehicle", "registrationNumber brand model color vehicleType owner")
    .populate(
      "driver",
      "name email role phone nid brtaDriverId licenseNumber avatar avatarUrl photo photoUrl image profileImage profilePhoto profilePicture cloudinaryUrl cloudinarySecureUrl picture"
    );
};

const mapLegacyDriverAssignment = (assignment = {}) => {
  const vehicle = assignment.vehicle || null;
  const driver = assignment.driver || null;
  const owner = assignment.owner || null;

  const hasVehicleObject =
    vehicle && typeof vehicle === "object" && !Array.isArray(vehicle);

  const hasDriverObject =
    driver && typeof driver === "object" && !Array.isArray(driver);

  const hasOwnerObject =
    owner && typeof owner === "object" && !Array.isArray(owner);

  return {
    ...assignment,
    _id: assignment._id,
    id: assignment._id,

    vehicle,
    driver,
    owner,

    vehicleId: hasVehicleObject
      ? vehicle._id
      : vehicle || assignment.vehicleId || "",

    driverId: hasDriverObject
      ? driver._id
      : driver || assignment.driverId || "",

    ownerId: hasOwnerObject
      ? owner._id
      : owner || assignment.ownerId || "",

    registrationNumber: hasVehicleObject
      ? vehicle.registrationNumber || vehicle.plateNumber || ""
      : assignment.registrationNumber || assignment.vehiclePlate || "",

    vehiclePlate: hasVehicleObject
      ? vehicle.registrationNumber || vehicle.plateNumber || ""
      : assignment.vehiclePlate || assignment.registrationNumber || "",

    vehicleName: hasVehicleObject
      ? `${vehicle.brand || ""} ${vehicle.model || ""}`.trim()
      : assignment.vehicleName || "",

    licenseNumber: hasDriverObject
      ? driver.licenseNumber || assignment.licenseNumber || ""
      : assignment.licenseNumber || "",

    driverName: hasDriverObject
      ? driver.name || "Assigned Driver"
      : assignment.driverName || "Assigned Driver",

    status: assignment.status || "active",
    driverSource: "STVES_ACCOUNT",
    source: "LEGACY_DRIVER_ASSIGNMENT",

    startDate: assignment.assignedFrom || assignment.startDate,
    endDate: assignment.assignedTo || assignment.endDate,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
};

const resolveVehicle = async ({ vehicle, registrationNumber }) => {
  let appVehicle = null;
  let plate = registrationNumber ? normalizePlate(registrationNumber) : "";

  if (vehicle && isObjectId(vehicle)) {
    appVehicle = await Vehicle.findById(vehicle).lean();

    if (!appVehicle) {
      throw new AppError("Selected vehicle was not found.", 404);
    }

    plate = normalizePlate(appVehicle.registrationNumber);
  }

  if (!appVehicle && plate) {
    appVehicle = await Vehicle.findOne({ registrationNumber: plate }).lean();
  }

  if (!plate) {
    throw new AppError("Vehicle registration number is required.", 400);
  }

  const brtaVehicle = await BrtaVehicle.findOne({
    registrationNumber: plate,
  }).lean();

  if (!appVehicle && !brtaVehicle) {
    throw new AppError("Vehicle not found in app or Mock BRTA Registry.", 404);
  }

  return {
    appVehicle,
    brtaVehicle,
    registrationNumber: plate,
  };
};

const resolveLicenseAndDriver = async ({ driver, license, licenseNumber }) => {
  let appDriver = null;
  let appLicense = null;
  let brtaLicense = null;
  let brtaDriver = null;

  let cleanLicense = licenseNumber ? normalizeLicense(licenseNumber) : "";

  if (driver && isObjectId(driver)) {
    appDriver = await User.findById(driver).lean();

    if (!appDriver) {
      throw new AppError("Selected driver was not found.", 404);
    }

    if (appDriver.role !== "driver") {
      throw new AppError("Selected user is not a driver.", 400);
    }
  }

  if (license && isObjectId(license)) {
    appLicense = await DrivingLicense.findById(license).lean();

    if (!appLicense) {
      throw new AppError("Selected license was not found.", 404);
    }

    cleanLicense = normalizeLicense(appLicense.licenseNumber);

    if (appLicense.driver && !appDriver) {
      appDriver = await User.findById(appLicense.driver).lean();
    }
  }

  if (!cleanLicense && appDriver?.licenseNumber) {
    cleanLicense = normalizeLicense(appDriver.licenseNumber);
  }

  if (!appLicense && appDriver?._id) {
    appLicense = await DrivingLicense.findOne({
      driver: appDriver._id,
    }).lean();

    if (appLicense?.licenseNumber && !cleanLicense) {
      cleanLicense = normalizeLicense(appLicense.licenseNumber);
    }
  }

  if (!appLicense && cleanLicense) {
    appLicense = await DrivingLicense.findOne({
      licenseNumber: cleanLicense,
    }).lean();

    if (appLicense?.driver && !appDriver) {
      appDriver = await User.findById(appLicense.driver).lean();
    }
  }

  if (appDriver?.brtaDriverId) {
    brtaDriver = await BrtaDriver.findOne({
      brtaDriverId: appDriver.brtaDriverId,
    }).lean();
  }

  if (!brtaDriver && appDriver?.nid) {
    brtaDriver = await BrtaDriver.findOne({
      nid: appDriver.nid,
    }).lean();
  }

  if (cleanLicense) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      licenseNumber: cleanLicense,
    }).lean();
  }

  if (!brtaLicense && appDriver?.nid) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      nid: appDriver.nid,
    }).lean();
  }

  if (!brtaLicense && appDriver?.brtaDriverId) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      brtaDriverId: appDriver.brtaDriverId,
    }).lean();
  }

  if (!brtaLicense && brtaDriver?.brtaDriverId) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      brtaDriverId: brtaDriver.brtaDriverId,
    }).lean();
  }

  if (brtaLicense?.licenseNumber && !cleanLicense) {
    cleanLicense = normalizeLicense(brtaLicense.licenseNumber);
  }

  if (brtaLicense?.brtaDriverId && !brtaDriver) {
    brtaDriver = await BrtaDriver.findOne({
      brtaDriverId: brtaLicense.brtaDriverId,
    }).lean();
  }

  if (!cleanLicense) {
    throw new AppError(
      "Driver license number is required. Please make sure this driver has an app or BRTA license record.",
      400
    );
  }

  if (!appLicense && !brtaLicense) {
    throw new AppError("License not found in app or Mock BRTA Registry.", 404);
  }

  return {
    appDriver,
    appLicense,
    brtaDriver,
    brtaLicense,
    licenseNumber: cleanLicense,
  };
};

const maskPhone = (phone = "") => {
  const text = String(phone || "").trim();

  if (text.length < 7) {
    return text || "";
  }

  return `${text.slice(0, 3)}****${text.slice(-4)}`;
};

const isValidLicenseStatus = (status) => {
  return ["valid", "active", "approved"].includes(
    String(status || "").toLowerCase()
  );
};

const buildDriverSearchResponse = ({
  matchType,
  appDriver,
  appLicense,
  brtaDriver,
  brtaLicense,
}) => {
  const licenseStatus =
    appLicense?.status || brtaLicense?.status || brtaDriver?.status || "unknown";

  const baseDriver = {
    id: appDriver?._id || undefined,
    brtaDriverId: appDriver?.brtaDriverId || brtaDriver?.brtaDriverId || brtaLicense?.brtaDriverId || "",
    name:
      appDriver?.name ||
      appLicense?.holderName ||
      brtaLicense?.holderName ||
      brtaDriver?.name ||
      "Unknown Driver",
    email: appDriver?.email || "",
    phoneMasked: maskPhone(appDriver?.phone || appLicense?.phone || brtaDriver?.phone || ""),
    nidMasked: appDriver?.nid
      ? `${String(appDriver.nid).slice(0, 3)}****${String(appDriver.nid).slice(-3)}`
      : brtaDriver?.nid
        ? `${String(brtaDriver.nid).slice(0, 3)}****${String(brtaDriver.nid).slice(-3)}`
        : "",
    licenseNumber: appLicense?.licenseNumber || brtaLicense?.licenseNumber || appDriver?.licenseNumber || "",
    licenseStatus,
    licenseClass: appLicense?.licenseClass || brtaLicense?.licenseClass || "",
    avatar:
      appDriver?.avatar ||
      appDriver?.avatarUrl ||
      appDriver?.photo ||
      appDriver?.photoUrl ||
      appDriver?.image ||
      appDriver?.profileImage ||
      appDriver?.profilePhoto ||
      appDriver?.profilePicture ||
      appDriver?.cloudinaryUrl ||
      appDriver?.cloudinarySecureUrl ||
      appDriver?.picture ||
      "",
    avatarUrl:
      appDriver?.avatarUrl ||
      appDriver?.photoUrl ||
      appDriver?.profileImage ||
      appDriver?.profilePhoto ||
      appDriver?.avatar ||
      appDriver?.photo ||
      appDriver?.image ||
      appDriver?.profilePicture ||
      appDriver?.cloudinaryUrl ||
      appDriver?.cloudinarySecureUrl ||
      appDriver?.picture ||
      "",
  };

  const licenseValid = isValidLicenseStatus(licenseStatus);
  const driverActive = !appDriver || String(appDriver.status || "active").toLowerCase() === "active";

  if (matchType === "STVES_ACCOUNT") {
    return {
      success: true,
      matchType: "STVES_ACCOUNT",
      canRequestAssignment: Boolean(appDriver && licenseValid && driverActive),
      canInvite: false,
      driver: baseDriver,
      message:
        appDriver && licenseValid && driverActive
          ? "Driver found with active STVES account and valid license."
          : "Driver found, but account or license is not eligible for assignment.",
    };
  }

  return {
    success: true,
    matchType: "BRTA_ONLY",
    canRequestAssignment: false,
    canInvite: Boolean(licenseValid),
    driver: baseDriver,
    message: licenseValid
      ? "Driver is found in BRTA registry but has no STVES account."
      : "Driver is found in BRTA registry, but license is not valid.",
  };
};

const searchDriverForAssignment = async ({ q }) => {
  const query = String(q || "").trim();

  if (!query) {
    throw new AppError("Driver search query is required.", 400);
  }

  const upperQuery = query.toUpperCase();
  const lowerQuery = query.toLowerCase();

  let appDriver = null;
  let appLicense = null;
  let brtaDriver = null;
  let brtaLicense = null;

  appLicense = await DrivingLicense.findOne({
    $or: [
      { licenseNumber: normalizeLicense(query) },
      { nid: query },
      { phone: query },
    ],
  }).lean();

  if (appLicense?.driver) {
    appDriver = await User.findById(appLicense.driver).lean();
  }

  if (!appDriver) {
    appDriver = await User.findOne({
      role: "driver",
      $or: [
        { email: lowerQuery },
        { phone: query },
        { nid: query },
        { brtaDriverId: upperQuery },
        { licenseNumber: normalizeLicense(query) },
      ],
    }).lean();
  }

  if (appDriver && !appLicense) {
    appLicense = await DrivingLicense.findOne({
      $or: [
        { driver: appDriver._id },
        { licenseNumber: normalizeLicense(appDriver.licenseNumber || "") },
        { nid: appDriver.nid || "" },
      ],
    }).lean();
  }

  brtaLicense = await BrtaDrivingLicense.findOne({
    $or: [
      { licenseNumber: normalizeLicense(query) },
      { nid: query },
      { brtaDriverId: upperQuery },
    ],
  }).lean();

  if (!brtaLicense && appLicense?.licenseNumber) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      licenseNumber: normalizeLicense(appLicense.licenseNumber),
    }).lean();
  }

  if (!brtaLicense && appDriver?.nid) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      nid: appDriver.nid,
    }).lean();
  }

  if (!brtaLicense && appDriver?.brtaDriverId) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      brtaDriverId: appDriver.brtaDriverId,
    }).lean();
  }

  brtaDriver = await BrtaDriver.findOne({
    $or: [
      { brtaDriverId: upperQuery },
      { nid: query },
      { phone: query },
    ],
  }).lean();

  if (!brtaDriver && brtaLicense?.brtaDriverId) {
    brtaDriver = await BrtaDriver.findOne({
      brtaDriverId: brtaLicense.brtaDriverId,
    }).lean();
  }

  if (!brtaDriver && appDriver?.brtaDriverId) {
    brtaDriver = await BrtaDriver.findOne({
      brtaDriverId: appDriver.brtaDriverId,
    }).lean();
  }

  if (!brtaDriver && appDriver?.nid) {
    brtaDriver = await BrtaDriver.findOne({
      nid: appDriver.nid,
    }).lean();
  }

  if (!appDriver && brtaDriver) {
    appDriver = await User.findOne({
      role: "driver",
      $or: [
        { brtaDriverId: brtaDriver.brtaDriverId },
        { nid: brtaDriver.nid },
        { phone: brtaDriver.phone },
      ],
    }).lean();
  }

  if (!appDriver && brtaLicense) {
    appDriver = await User.findOne({
      role: "driver",
      $or: [
        { brtaDriverId: brtaLicense.brtaDriverId },
        { nid: brtaLicense.nid },
        { licenseNumber: brtaLicense.licenseNumber },
      ],
    }).lean();
  }

  if (appDriver) {
    return buildDriverSearchResponse({
      matchType: "STVES_ACCOUNT",
      appDriver,
      appLicense,
      brtaDriver,
      brtaLicense,
    });
  }

  if (brtaDriver || brtaLicense) {
    return buildDriverSearchResponse({
      matchType: "BRTA_ONLY",
      appDriver: null,
      appLicense: null,
      brtaDriver,
      brtaLicense,
    });
  }

  return {
    success: false,
    matchType: "NOT_FOUND",
    canRequestAssignment: false,
    canInvite: false,
    driver: null,
    message: "No valid driver found in STVES or BRTA registry.",
  };
};

const ensureOwnerPermission = async ({ user, appVehicle, brtaVehicle }) => {
  if (user.role === "admin") return;

  if (user.role !== "owner") {
    throw new AppError("Only admin or owner can create assignment.", 403);
  }

  if (appVehicle?.owner && String(appVehicle.owner) !== String(user._id)) {
    throw new AppError("You are not the owner of this vehicle.", 403);
  }

  if (!appVehicle && brtaVehicle?.brtaOwnerId && user.nid) {
    const brtaOwner = await BrtaOwner.findOne({
      brtaOwnerId: brtaVehicle.brtaOwnerId,
      nid: user.nid,
    }).lean();

    if (!brtaOwner) {
      throw new AppError("You are not the BRTA owner of this vehicle.", 403);
    }
  }
};

const createAssignment = async (payload, user) => {
  const vehicle = payload.vehicle || payload.vehicleId;
  const registrationNumber = payload.registrationNumber;

  const driver = payload.driver || payload.driverId;
  const license = payload.license || payload.licenseId;
  const licenseNumber = payload.licenseNumber;

  const startDate = payload.startDate;
  const endDate = payload.endDate;

  const notes = payload.notes || payload.note || "";
  const requestNote = payload.requestNote || payload.notes || payload.note || "";

  const vehicleInfo = await resolveVehicle({ vehicle, registrationNumber });

  const licenseInfo = await resolveLicenseAndDriver({
    driver,
    license,
    licenseNumber,
  });

  await ensureOwnerPermission({
    user,
    appVehicle: vehicleInfo.appVehicle,
    brtaVehicle: vehicleInfo.brtaVehicle,
  });

  const owner =
    vehicleInfo.appVehicle?.owner ||
    (user.role === "owner" ? user._id : undefined);

  if (!owner && user.role !== "admin") {
    throw new AppError("Vehicle owner could not be resolved.", 400);
  }

  if (!licenseInfo.appDriver?._id && user.role === "owner") {
    throw new AppError(
      "This driver has no active STVES account. Please use the invitation flow for BRTA-only drivers.",
      400
    );
  }

  if (
    licenseInfo.appDriver &&
    String(licenseInfo.appDriver.status || "active").toLowerCase() !== "active"
  ) {
    throw new AppError("Selected driver account is not active.", 400);
  }

  const existingStatuses = [
    "pending_driver_approval",
    "invitation_pending",
    "active",
  ];

  const duplicateQuery = {
    status: { $in: existingStatuses },
    $or: [
      {
        registrationNumber: vehicleInfo.registrationNumber,
        licenseNumber: licenseInfo.licenseNumber,
      },
    ],
  };

  if (vehicleInfo.appVehicle?._id && licenseInfo.appDriver?._id) {
    duplicateQuery.$or.push({
      vehicle: vehicleInfo.appVehicle._id,
      driver: licenseInfo.appDriver._id,
    });
  }

  const existingAssignment = await Assignment.findOne(duplicateQuery);

  if (existingAssignment) {
    return {
      assignment: await populateAssignment(
        Assignment.findById(existingAssignment._id)
      ).lean(),
      alreadyExists: true,
      assignmentStatus: existingAssignment.status,
      requiresDriverApproval:
        existingAssignment.status === "pending_driver_approval",
    };
  }

  const shouldActivateImmediately = user.role === "admin";
  const assignmentStatus = shouldActivateImmediately
    ? "active"
    : "pending_driver_approval";

  const assignment = await Assignment.create({
    vehicle: vehicleInfo.appVehicle?._id || undefined,
    registrationNumber: vehicleInfo.registrationNumber,

    driver: licenseInfo.appDriver?._id || undefined,

    license: licenseInfo.appLicense?._id || undefined,
    licenseNumber: licenseInfo.licenseNumber,

    owner,
    assignedBy: user._id,
    requestedBy: user._id,

    status: assignmentStatus,
    driverSource: licenseInfo.appDriver?._id ? "STVES_ACCOUNT" : "BRTA_ONLY",
    brtaDriverId:
      licenseInfo.brtaDriver?.brtaDriverId ||
      licenseInfo.brtaLicense?.brtaDriverId ||
      licenseInfo.appDriver?.brtaDriverId ||
      undefined,

    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : undefined,

    requestNote,
    notes,
    approvedByDriverAt: shouldActivateImmediately ? new Date() : undefined,
  });

  if (shouldActivateImmediately && licenseInfo.brtaLicense?.brtaDriverId) {
    await BrtaDriverVehicleAuthorization.updateOne(
      {
        registrationNumber: vehicleInfo.registrationNumber,
        licenseNumber: licenseInfo.licenseNumber,
      },
      {
        $set: {
          registrationNumber: vehicleInfo.registrationNumber,
          licenseNumber: licenseInfo.licenseNumber,
          brtaDriverId: licenseInfo.brtaLicense.brtaDriverId,
          authorizationType: "assigned_driver",
          status: "active",
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : undefined,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  const populated = await populateAssignment(
    Assignment.findById(assignment._id)
  ).lean();

  return {
    assignment: populated,
    alreadyExists: false,
    assignmentStatus,
    requiresDriverApproval: assignmentStatus === "pending_driver_approval",
  };
};

const createAssignmentInvitation = async (payload, user) => {
  const registrationNumber = payload.registrationNumber;
  const licenseNumber = payload.licenseNumber;
  const brtaDriverId = payload.brtaDriverId;
  const notes = payload.notes || payload.note || "";

  if (!registrationNumber) {
    throw new AppError("Vehicle registration number is required.", 400);
  }

  if (!licenseNumber && !brtaDriverId) {
    throw new AppError(
      "Driver license number or BRTA driver ID is required.",
      400
    );
  }

  const vehicleInfo = await resolveVehicle({ registrationNumber });

  await ensureOwnerPermission({
    user,
    appVehicle: vehicleInfo.appVehicle,
    brtaVehicle: vehicleInfo.brtaVehicle,
  });

  const cleanLicense = licenseNumber ? normalizeLicense(licenseNumber) : "";
  const cleanBrtaDriverId = brtaDriverId
    ? String(brtaDriverId).trim().toUpperCase()
    : "";

  let brtaLicense = null;
  let brtaDriver = null;

  if (cleanLicense) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      licenseNumber: cleanLicense,
    }).lean();
  }

  if (cleanBrtaDriverId) {
    brtaDriver = await BrtaDriver.findOne({
      brtaDriverId: cleanBrtaDriverId,
    }).lean();
  }

  if (!brtaDriver && brtaLicense?.brtaDriverId) {
    brtaDriver = await BrtaDriver.findOne({
      brtaDriverId: brtaLicense.brtaDriverId,
    }).lean();
  }

  if (!brtaLicense && brtaDriver?.brtaDriverId) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      brtaDriverId: brtaDriver.brtaDriverId,
    }).lean();
  }

  if (!brtaLicense && !brtaDriver) {
    throw new AppError("Driver not found in BRTA registry.", 404);
  }

  const finalLicenseNumber =
    brtaLicense?.licenseNumber || cleanLicense || "";

  const finalBrtaDriverId =
    brtaDriver?.brtaDriverId ||
    brtaLicense?.brtaDriverId ||
    cleanBrtaDriverId ||
    "";

  const existingDriverOr = [];

  if (finalBrtaDriverId) {
    existingDriverOr.push({ brtaDriverId: finalBrtaDriverId });
  }

  if (brtaDriver?.nid || brtaLicense?.nid) {
    existingDriverOr.push({ nid: brtaDriver?.nid || brtaLicense?.nid });
  }

  if (finalLicenseNumber) {
    existingDriverOr.push({ licenseNumber: finalLicenseNumber });
  }

  const existingStvesDriver =
    existingDriverOr.length > 0
      ? await User.findOne({
        role: "driver",
        $or: existingDriverOr,
      }).lean()
      : null;

  if (existingStvesDriver) {
    throw new AppError(
      "This driver already has a STVES account. Please send an assignment request instead.",
      400
    );
  }

  const existingInvitation = await Assignment.findOne({
    registrationNumber: vehicleInfo.registrationNumber,
    licenseNumber: finalLicenseNumber,
    status: "invitation_pending",
  });

  if (existingInvitation) {
    return {
      assignment: await populateAssignment(
        Assignment.findById(existingInvitation._id)
      ).lean(),
      alreadyExists: true,
    };
  }

  const assignment = await Assignment.create({
    vehicle: vehicleInfo.appVehicle?._id || undefined,
    registrationNumber: vehicleInfo.registrationNumber,

    owner: vehicleInfo.appVehicle?.owner || user._id,
    assignedBy: user._id,
    requestedBy: user._id,

    status: "invitation_pending",
    driverSource: "BRTA_ONLY",

    brtaDriverId: finalBrtaDriverId || undefined,
    licenseNumber: finalLicenseNumber || undefined,

    invitationContact: {
      phone: brtaDriver?.phone || brtaLicense?.phone || "",
      email: brtaDriver?.email || "",
    },

    requestNote: notes,
    notes,
    startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
  });

  return {
    assignment: await populateAssignment(
      Assignment.findById(assignment._id)
    ).lean(),
    alreadyExists: false,
  };
};

const buildAssignmentQueryForRole = async (user) => {
  if (user.role === "admin") return {};

  if (user.role === "owner") {
    const appVehicles = await Vehicle.find({ owner: user._id }).lean();

    const vehicleIds = appVehicles.map((item) => item._id);
    const plates = appVehicles
      .map((item) => item.registrationNumber)
      .filter(Boolean)
      .map(normalizePlate);

    return {
      $or: [
        { owner: user._id },
        { vehicle: { $in: vehicleIds } },
        { registrationNumber: { $in: plates } },
      ],
    };
  }

  if (user.role === "driver") {
    const appLicenses = await DrivingLicense.find({ driver: user._id }).lean();

    const licenseIds = appLicenses.map((item) => item._id);
    const licenseNumbers = appLicenses
      .map((item) => item.licenseNumber)
      .filter(Boolean)
      .map(normalizeLicense);

    return {
      $or: [
        { driver: user._id },
        { license: { $in: licenseIds } },
        { licenseNumber: { $in: licenseNumbers } },
      ],
    };
  }

  if (user.role === "police") {
    return {
      status: "active",
    };
  }

  return { _id: null };
};

const buildLegacyAssignmentQueryForRole = async (user) => {
  if (user.role === "admin") return {};

  if (user.role === "owner") {
    const appVehicles = await Vehicle.find({ owner: user._id }).lean();
    const vehicleIds = appVehicles.map((item) => item._id);

    return {
      $or: [{ owner: user._id }, { vehicle: { $in: vehicleIds } }],
    };
  }

  if (user.role === "driver") {
    return {
      driver: user._id,
    };
  }

  if (user.role === "police") {
    return {
      status: "active",
    };
  }

  return { _id: null };
};

const getAssignments = async (user, filters = {}) => {
  const roleQuery = await buildAssignmentQueryForRole(user);
  const legacyRoleQuery = await buildLegacyAssignmentQueryForRole(user);

  const query = {
    ...roleQuery,
  };

  const legacyQuery = {
    ...legacyRoleQuery,
  };

  if (filters.status) {
    query.status = String(filters.status).toLowerCase();
    legacyQuery.status = String(filters.status).toLowerCase();
  }

  if (filters.registrationNumber) {
    query.registrationNumber = normalizePlate(filters.registrationNumber);
  }

  if (filters.licenseNumber) {
    query.licenseNumber = normalizeLicense(filters.licenseNumber);
  }

  const [assignments, legacyAssignments] = await Promise.all([
    populateAssignment(Assignment.find(query).sort({ createdAt: -1 })).lean(),

    populateLegacyDriverAssignment(
      DriverAssignment.find(legacyQuery).sort({ createdAt: -1 })
    ).lean(),
  ]);

  const merged = [...assignments];

  const seenKeys = new Set(
    assignments.map((assignment) =>
      [
        String(assignment.vehicle?._id || assignment.vehicle || ""),
        String(assignment.driver?._id || assignment.driver || ""),
        String(assignment.registrationNumber || ""),
        String(assignment.licenseNumber || ""),
        String(assignment.status || ""),
      ].join("|")
    )
  );

  legacyAssignments.map(mapLegacyDriverAssignment).forEach((assignment) => {
    const key = [
      String(assignment.vehicle?._id || assignment.vehicle || ""),
      String(assignment.driver?._id || assignment.driver || ""),
      String(assignment.registrationNumber || ""),
      String(assignment.licenseNumber || ""),
      String(assignment.status || ""),
    ].join("|");

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      merged.push(assignment);
    }
  });

  return merged.sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
};

const removeAssignment = async ({ id, reason, user }) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid assignment id.", 400);
  }

  const assignment = await Assignment.findById(id).lean();

  if (!assignment) {
    throw new AppError("Assignment not found.", 404);
  }

  if (user.role === "owner") {
    const appVehicle = assignment.vehicle
      ? await Vehicle.findById(assignment.vehicle).lean()
      : null;

    const isOwnerByAssignment =
      assignment.owner && String(assignment.owner) === String(user._id);

    const isOwnerByVehicle =
      appVehicle?.owner && String(appVehicle.owner) === String(user._id);

    if (!isOwnerByAssignment && !isOwnerByVehicle) {
      throw new AppError("You are not allowed to remove this assignment.", 403);
    }
  }

  const updatedAssignment = await populateAssignment(
    Assignment.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "removed",
          removeInfo: {
            removedBy: user._id,
            removedAt: new Date(),
            reason: reason || "Assignment removed.",
          },
        },
      },
      {
        new: true,
        runValidators: false,
      }
    )
  ).lean();

  if (assignment.registrationNumber && assignment.licenseNumber) {
    await BrtaDriverVehicleAuthorization.updateOne(
      {
        registrationNumber: assignment.registrationNumber,
        licenseNumber: assignment.licenseNumber,
        status: "active",
      },
      {
        $set: {
          status: "revoked",
          updatedAt: new Date(),
        },
      }
    );
  }

  return updatedAssignment;
};

const checkAssignment = async ({ registrationNumber, licenseNumber }) => {
  let plate = "";
  let cleanLicense = "";

  // First param can be vehicle ObjectId or registration number
  if (isObjectId(registrationNumber)) {
    const appVehicle = await Vehicle.findById(registrationNumber).lean();

    if (appVehicle?.registrationNumber) {
      plate = normalizePlate(appVehicle.registrationNumber);
    }
  } else {
    plate = normalizePlate(registrationNumber);
  }

  // Second param can be license ObjectId, driver ObjectId, or license number
  if (isObjectId(licenseNumber)) {
    const appLicenseById = await DrivingLicense.findById(licenseNumber).lean();

    if (appLicenseById?.licenseNumber) {
      cleanLicense = normalizeLicense(appLicenseById.licenseNumber);
    } else {
      const appLicenseByDriver = await DrivingLicense.findOne({
        driver: licenseNumber,
      }).lean();

      if (appLicenseByDriver?.licenseNumber) {
        cleanLicense = normalizeLicense(appLicenseByDriver.licenseNumber);
      }
    }
  } else {
    cleanLicense = normalizeLicense(licenseNumber);
  }

  if (!plate || !cleanLicense) {
    throw new AppError("Registration number and license number are required.", 400);
  }

  const now = new Date();

  const appAssignment = await Assignment.findOne({
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    status: "active",
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  }).lean();

  if (appAssignment) {
    return {
      checked: true,
      authorized: true,
      source: "STVES_ASSIGNMENT",
      registrationNumber: plate,
      licenseNumber: cleanLicense,
      message: "Driver is authorized by STVES assignment.",
      assignment: appAssignment,
    };
  }

  const brtaAuthorization = await BrtaDriverVehicleAuthorization.findOne({
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    status: "active",
  }).lean();

  if (brtaAuthorization) {
    if (brtaAuthorization.endDate && new Date(brtaAuthorization.endDate) < now) {
      return {
        checked: true,
        authorized: false,
        source: "BRTA_MOCK",
        registrationNumber: plate,
        licenseNumber: cleanLicense,
        message: "BRTA authorization is expired.",
        authorization: brtaAuthorization,
      };
    }

    return {
      checked: true,
      authorized: true,
      source: "BRTA_MOCK",
      registrationNumber: plate,
      licenseNumber: cleanLicense,
      message: "Driver is authorized by Mock BRTA Registry.",
      authorization: brtaAuthorization,
    };
  }

  return {
    checked: true,
    authorized: false,
    source: "NONE",
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    message: "No active authorization found for this driver and vehicle.",
  };
};

const getMyAssignmentRequests = async (user) => {
  if (!user || user.role !== "driver") {
    throw new AppError("Only drivers can view assignment requests.", 403);
  }

  return populateAssignment(
    Assignment.find({
      driver: user._id,
      status: "pending_driver_approval",
    }).sort({ createdAt: -1 })
  ).lean();
};

const respondToAssignmentRequest = async ({ assignmentId, action, responseNote }, user) => {
  if (!user || user.role !== "driver") {
    throw new AppError("Only drivers can respond to assignment requests.", 403);
  }

  if (!["accept", "reject"].includes(String(action || "").toLowerCase())) {
    throw new AppError("Action must be accept or reject.", 400);
  }

  const assignment = await Assignment.findById(assignmentId);

  if (!assignment) {
    throw new AppError("Assignment request not found.", 404);
  }

  if (String(assignment.driver) !== String(user._id)) {
    throw new AppError("You are not authorized to respond to this request.", 403);
  }

  if (assignment.status !== "pending_driver_approval") {
    throw new AppError("This assignment request is no longer pending.", 400);
  }

  const cleanAction = String(action).toLowerCase();

  if (cleanAction === "reject") {
    assignment.status = "rejected";
    assignment.rejectedByDriverAt = new Date();
    assignment.driverResponseNote = responseNote || "";
    await assignment.save();

    return populateAssignment(Assignment.findById(assignment._id)).lean();
  }

  assignment.status = "active";
  assignment.approvedByDriverAt = new Date();
  assignment.driverResponseNote = responseNote || "";
  await assignment.save();

  if (assignment.registrationNumber && assignment.licenseNumber) {
    await BrtaDriverVehicleAuthorization.updateOne(
      {
        registrationNumber: assignment.registrationNumber,
        licenseNumber: assignment.licenseNumber,
      },
      {
        $set: {
          registrationNumber: assignment.registrationNumber,
          licenseNumber: assignment.licenseNumber,
          brtaDriverId: assignment.brtaDriverId || undefined,
          authorizationType: "assigned_driver",
          status: "active",
          startDate: assignment.startDate || new Date(),
          endDate: assignment.endDate || undefined,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  return populateAssignment(Assignment.findById(assignment._id)).lean();
};

module.exports = {
  createAssignment,
  getAssignments,
  removeAssignment,
  checkAssignment,
  searchDriverForAssignment,
  getMyAssignmentRequests,
  respondToAssignmentRequest,
  createAssignmentInvitation,
};