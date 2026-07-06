const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const AppError = require("../utils/AppError");
const brtaMockService = require("../services/brtaMock.service");
const logService = require("../services/log.service");
const Vehicle = require("../models/Vehicle");
const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaOwner = require("../models/BrtaOwner");
const { buildVehicleQR, normalizePlate } = require("../utils/qr");

const normalizeText = (value = "") => {
  return String(value || "").trim().toUpperCase();
};

const normalizeLooseText = (value = "") => {
  return String(value || "").trim().toLowerCase();
};

const valuesMatch = (left, right) => {
  return normalizeText(left) === normalizeText(right);
};

const optionalTextMatches = (submittedValue, brtaValue) => {
  if (submittedValue === undefined || submittedValue === null || submittedValue === "") {
    return true;
  }

  return normalizeLooseText(submittedValue) === normalizeLooseText(brtaValue);
};

const optionalYearMatches = (submittedYear, brtaYear) => {
  if (submittedYear === undefined || submittedYear === null || submittedYear === "") {
    return true;
  }

  return Number(submittedYear) === Number(brtaYear);
};

const getExpiryDate = (documentPart) => {
  return documentPart?.expiryDate || null;
};

const OWNER_VEHICLE_UPDATE_ALLOWED_FIELDS = [];

const OWNER_VEHICLE_PROTECTED_FIELDS = [
  "registrationNumber",
  "owner",
  "vehicleType",
  "brand",
  "model",
  "year",
  "color",
  "chassisNumber",
  "engineNumber",
  "registrationDate",
  "registrationExpiry",
  "fitnessExpiry",
  "taxTokenExpiry",
  "insuranceExpiry",
  "routePermitExpiry",
  "qrCode",
  "status",
  "safetyScore",
  "complianceScore",
  "riskLevel",
];

const pickAllowedOwnerVehicleUpdates = (payload = {}) => {
  const protectedField = OWNER_VEHICLE_PROTECTED_FIELDS.find((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );

  if (protectedField) {
    throw new AppError(
      `${protectedField} is an official BRTA vehicle field and cannot be changed by the owner.`,
      403
    );
  }

  return OWNER_VEHICLE_UPDATE_ALLOWED_FIELDS.reduce((updates, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = payload[field];
    }

    return updates;
  }, {});
};

const normalizeVehicleTypeForApp = (type = "other") => {
  const normalized = normalizeLooseText(type);

  const allowedTypes = [
    "car",
    "bus",
    "truck",
    "motorcycle",
    "bike",
    "cng",
    "microbus",
    "other",
  ];

  return allowedTypes.includes(normalized) ? normalized : "other";
};

const validateOwnerVehicleAgainstBrta = async ({ payload, registrationNumber, user }) => {
  const brtaVehicle = await BrtaVehicle.findOne({
    registrationNumber,
  }).lean();

  if (!brtaVehicle) {
    throw new AppError(
      "Vehicle not found in BRTA registry. You can only register a BRTA-verified vehicle.",
      404
    );
  }

  if (["suspended", "blacklisted"].includes(String(brtaVehicle.status || "").toLowerCase())) {
    throw new AppError(
      `This vehicle is ${brtaVehicle.status} in BRTA registry and cannot be registered.`,
      403
    );
  }

  if (!payload.chassisNumber || !valuesMatch(payload.chassisNumber, brtaVehicle.chassisNumber)) {
    throw new AppError("Chassis number does not match BRTA record.", 400);
  }

  if (!payload.engineNumber || !valuesMatch(payload.engineNumber, brtaVehicle.engineNumber)) {
    throw new AppError("Engine number does not match BRTA record.", 400);
  }

  if (!optionalTextMatches(payload.brand, brtaVehicle.brand)) {
    throw new AppError("Brand does not match BRTA record.", 400);
  }

  if (!optionalTextMatches(payload.model, brtaVehicle.model)) {
    throw new AppError("Model does not match BRTA record.", 400);
  }

  if (!optionalYearMatches(payload.year, brtaVehicle.year)) {
    throw new AppError("Year does not match BRTA record.", 400);
  }

  if (!optionalTextMatches(payload.color, brtaVehicle.color)) {
    throw new AppError("Color does not match BRTA record.", 400);
  }

  const brtaOwner = brtaVehicle.brtaOwnerId
    ? await BrtaOwner.findOne({ brtaOwnerId: brtaVehicle.brtaOwnerId }).lean()
    : null;

  // Soft ownership validation:
  // If both user NID and BRTA owner NID exist, they must match.
  // This avoids blocking old demo owner accounts that do not have NID yet.
  if (user?.nid && brtaOwner?.nid && normalizeText(user.nid) !== normalizeText(brtaOwner.nid)) {
    throw new AppError(
      "This vehicle belongs to another BRTA owner. Owner NID does not match.",
      403
    );
  }

  const brtaDocuments = await brtaMockService.getUnifiedVehicleDocuments(
    registrationNumber
  );

  return {
    brtaVehicle,
    brtaOwner,
    brtaDocuments,
  };
};

const buildOwnerVehicleRegistrationDraft = ({ brtaVehicle, brtaDocuments }) => {
  const registrationNumber = normalizePlate(brtaVehicle.registrationNumber);

  return {
    registrationNumber,
    vehicleType: normalizeVehicleTypeForApp(brtaVehicle.vehicleType),
    brand: brtaVehicle.brand || "",
    model: brtaVehicle.model || "",
    year: brtaVehicle.year || "",
    color: brtaVehicle.color || "",

    chassisNumber: brtaVehicle.chassisNumber || "",
    engineNumber: brtaVehicle.engineNumber || "",

    registrationDate: brtaVehicle.registrationDate || "",
    registrationExpiry:
      brtaVehicle.registrationExpiry ||
      getExpiryDate(brtaDocuments?.registrationCertificate) ||
      "",

    fitnessExpiry: getExpiryDate(brtaDocuments?.fitnessCertificate) || "",
    taxTokenExpiry: getExpiryDate(brtaDocuments?.taxToken) || "",
    insuranceExpiry: getExpiryDate(brtaDocuments?.insurance) || "",
    routePermitExpiry: getExpiryDate(brtaDocuments?.routePermit) || "",

    qrCode: brtaVehicle.qrCode || buildVehicleQR(registrationNumber),
    status: brtaVehicle.status || "active",
    source: "BRTA_MOCK",
    locked: true,
  };
};

const verifyOwnerVehicleForRegistration = asyncHandler(async (req, res) => {
  const registrationNumber = normalizePlate(
    req.params.plate || req.params.registrationNumber || req.query.registrationNumber
  );

  if (!registrationNumber) {
    throw new AppError("Vehicle registration number is required.", 400);
  }

  const brtaVehicle = await BrtaVehicle.findOne({
    registrationNumber,
  }).lean();

  if (!brtaVehicle) {
    throw new AppError(
      "Vehicle not found in BRTA registry. You can only register a BRTA-verified vehicle.",
      404
    );
  }

  if (["suspended", "blacklisted"].includes(String(brtaVehicle.status || "").toLowerCase())) {
    throw new AppError(
      `This vehicle is ${brtaVehicle.status} in BRTA registry and cannot be registered.`,
      403
    );
  }

  const brtaOwner = brtaVehicle.brtaOwnerId
    ? await BrtaOwner.findOne({ brtaOwnerId: brtaVehicle.brtaOwnerId }).lean()
    : null;

  if (!brtaOwner) {
    throw new AppError("BRTA owner record was not found for this vehicle.", 404);
  }

  if (brtaOwner.status && String(brtaOwner.status).toLowerCase() !== "active") {
    throw new AppError(
      `This BRTA owner record is ${brtaOwner.status}. Vehicle registration is not allowed.`,
      403
    );
  }

  const userNid = normalizeText(req.user?.nid);
  const userBrtaOwnerId = normalizeText(req.user?.brtaOwnerId);
  const brtaOwnerNid = normalizeText(brtaOwner?.nid);
  const brtaOwnerId = normalizeText(brtaOwner?.brtaOwnerId);

  const ownerIdMatches =
    userBrtaOwnerId && brtaOwnerId && userBrtaOwnerId === brtaOwnerId;

  const ownerNidMatches =
    userNid && brtaOwnerNid && userNid === brtaOwnerNid;

  if (!ownerIdMatches && !ownerNidMatches) {
    throw new AppError(
      "This vehicle is not linked with your BRTA owner profile.",
      403
    );
  }

  const existingVehicle = await Vehicle.findOne({
    registrationNumber,
  }).lean();

  if (existingVehicle) {
    if (String(existingVehicle.owner) === String(req.user._id)) {
      throw new AppError(
        "This vehicle is already registered in your STVES account.",
        409
      );
    }

    throw new AppError(
      "This vehicle is already registered in STVES by another owner.",
      409
    );
  }

  const brtaDocuments = await brtaMockService.getUnifiedVehicleDocuments(
    registrationNumber
  );

  const vehicle = buildOwnerVehicleRegistrationDraft({
    brtaVehicle,
    brtaDocuments,
  });

  return sendSuccess(res, 200, "Vehicle verified from BRTA. Official details loaded.", {
    vehicle,
    owner: {
      brtaOwnerId: brtaOwner.brtaOwnerId,
      name: brtaOwner.name,
      nid: brtaOwner.nid,
    },
    isOwnerMatched: true,
  });
});

const createVehicle = asyncHandler(async (req, res) => {
  const payload = req.body;

  const registrationNumber = normalizePlate(payload.registrationNumber);

  if (!registrationNumber) {
    throw new AppError("Registration number is required.", 400);
  }

  const owner = req.user.role === "owner" ? req.user._id : payload.owner;

  if (!owner) {
    throw new AppError("Vehicle owner is required.", 400);
  }

  const existingVehicle = await Vehicle.findOne({ registrationNumber });

  if (existingVehicle) {
    throw new AppError("Vehicle already exists with this registration number.", 409);
  }

  let officialVehiclePayload = {
    ...payload,
    registrationNumber,
    owner,
    qrCode: payload.qrCode || buildVehicleQR(registrationNumber),
  };

  if (req.user.role === "owner") {
    const { brtaVehicle, brtaDocuments } = await validateOwnerVehicleAgainstBrta({
      payload,
      registrationNumber,
      user: req.user,
    });

    officialVehiclePayload = {
      registrationNumber,
      owner,

      vehicleType: normalizeVehicleTypeForApp(brtaVehicle.vehicleType),
      brand: brtaVehicle.brand || "",
      model: brtaVehicle.model || "",
      year: brtaVehicle.year,
      color: brtaVehicle.color || "",

      chassisNumber: brtaVehicle.chassisNumber,
      engineNumber: brtaVehicle.engineNumber,

      registrationDate: brtaVehicle.registrationDate || new Date(),
      registrationExpiry:
        brtaVehicle.registrationExpiry ||
        getExpiryDate(brtaDocuments?.registrationCertificate),

      fitnessExpiry: getExpiryDate(brtaDocuments?.fitnessCertificate),
      taxTokenExpiry: getExpiryDate(brtaDocuments?.taxToken),
      insuranceExpiry: getExpiryDate(brtaDocuments?.insurance),
      routePermitExpiry: getExpiryDate(brtaDocuments?.routePermit),

      qrCode: brtaVehicle.qrCode || buildVehicleQR(registrationNumber),
      status: brtaVehicle.status || "active",
    };
  }

  const vehicle = await Vehicle.create(officialVehiclePayload);

  return sendSuccess(res, 201, "Vehicle created successfully.", {
    vehicle,
  });
});

const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    throw new AppError("Vehicle not found.", 404);
  }

  if (
    req.user.role === "owner" &&
    vehicle.owner &&
    String(vehicle.owner) !== String(req.user._id)
  ) {
    throw new AppError("You are not allowed to update this vehicle.", 403);
  }

  let payload = { ...req.body };

  if (req.user.role === "owner") {
    payload = pickAllowedOwnerVehicleUpdates(payload);

    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "Vehicle information is synced from BRTA. Owners cannot update official vehicle fields from this page.",
        403
      );
    }
  }

  if (payload.registrationNumber) {
    payload.registrationNumber = normalizePlate(payload.registrationNumber);
    payload.qrCode = payload.qrCode || buildVehicleQR(payload.registrationNumber);
  }

  const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, payload, {
    returnDocument: "after",
    runValidators: true,
  }).populate("owner", "name email phone role");

  return sendSuccess(res, 200, "Vehicle updated successfully.", {
    vehicle: updatedVehicle,
  });
});


const updateVehicleStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatus = ["active", "suspended", "blacklisted"];

  if (!allowedStatus.includes(status)) {
    throw new AppError("Invalid vehicle status.", 400);
  }

  let registrationNumber = "";
  let updatedVehicle = null;

  const appVehicle = await Vehicle.findById(id);

  if (appVehicle) {
    appVehicle.status = status;
    await appVehicle.save();

    registrationNumber = appVehicle.registrationNumber;

    await BrtaVehicle.findOneAndUpdate(
      { registrationNumber },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: false,
      }
    );

    updatedVehicle = appVehicle;
  } else {
    const brtaVehicle = await BrtaVehicle.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: false,
      }
    );

    if (!brtaVehicle) {
      throw new AppError("Vehicle not found.", 404);
    }

    registrationNumber = brtaVehicle.registrationNumber;

    await Vehicle.findOneAndUpdate(
      { registrationNumber },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: false,
      }
    );

    updatedVehicle = brtaVehicle;
  }

  let responseVehicle = updatedVehicle;

  if (registrationNumber) {
    const verified = await brtaMockService.verifyVehicle({
      registrationNumber,
    });

    if (verified?.found && verified.vehicle) {
      responseVehicle = verified.vehicle;
    }
  }

  return sendSuccess(res, 200, "Vehicle status updated successfully.", {
    vehicle: responseVehicle,
  });
});

const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await brtaMockService.getAllVehicles();

  return sendSuccess(res, 200, "Vehicles fetched successfully.", {
    count: vehicles.length,
    vehicles,
  });
});

const getMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await brtaMockService.getOwnerVehicles(req.user);

  return sendSuccess(res, 200, "Owner vehicles fetched successfully.", {
    count: vehicles.length,
    vehicles,
  });
});

const verifyVehicle = asyncHandler(async (req, res) => {
  const registrationNumber = req.params.plate || req.params.registrationNumber;

  const licenseNumber =
    req.query.licenseNumber ||
    req.query.driverLicense ||
    req.query.driverLicenseNumber ||
    "";

  const result = await brtaMockService.verifyVehicle({
    registrationNumber,
    licenseNumber,
  });

  if (!result.found) {
    throw new AppError("Vehicle not found in Mock BRTA Registry.", 404, [
      result.verification,
    ]);
  }

  await logService.createVerificationLog({
    req,
    user: req.user,
    searchType: "vehicle",
    searchValue: registrationNumber,
    registrationNumber: result.registrationNumber,
    result: result.verification?.result,
    dataSource: result.dataSource,
    brtaProvider: result.brtaProvider,
    verification: result.verification,
    issues: result.issues,
  });

  return sendSuccess(
    res,
    200,
    result.verification.isCompliant
      ? "Vehicle verified successfully."
      : "Vehicle verified with compliance issues.",
    result
  );
});

module.exports = {
  getVehicles,
  getMyVehicles,
  verifyVehicle,
  verifyOwnerVehicleForRegistration,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
};