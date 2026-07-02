const mongoose = require("mongoose");

const BrtaOwner = require("../models/BrtaOwner");
const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaVehicleDocument = require("../models/BrtaVehicleDocument");
const BrtaBlacklistRecord = require("../models/BrtaBlacklistRecord");
const BrtaDriverVehicleAuthorization = require("../models/BrtaDriverVehicleAuthorization");
const Assignment = require("../models/Assignment");
const DriverAssignment = require("../models/DriverAssignment");
const Vehicle = require("../models/Vehicle");
const Violation = require("../models/Violation");

const env = require("../config/env");
const { normalizePlate, normalizeLicense, buildVehicleQR } = require("../utils/qr");
const { calculateVehicleSafetyScore } = require("./safetyScore.service");

const toPlain = (doc) => {
  if (!doc) return null;
  return doc.toObject ? doc.toObject() : doc;
};

const getExpiryDate = (documentPart) => {
  return documentPart?.expiryDate || null;
};

const getIssueDate = (documentPart) => {
  return documentPart?.issueDate || null;
};

const getCleanPart = (documentPart = {}, fallback = {}) => {
  return {
    ...fallback,
    ...documentPart,
    issueDate: getIssueDate(documentPart) || getIssueDate(fallback) || null,
    expiryDate: getExpiryDate(documentPart) || getExpiryDate(fallback) || null,
    status: documentPart?.status || fallback?.status || "valid",
  };
};

const findLegacyBrtaDocument = async (collectionName, plate) => {
  try {
    const collection = mongoose.connection.collection(collectionName);

    return collection.findOne({
      registrationNumber: plate,
    });
  } catch (error) {
    return null;
  }
};

const getUnifiedVehicleDocuments = async (registrationNumber) => {
  const plate = normalizePlate(registrationNumber);

  const [documentBundle, fitnessDoc, taxTokenDoc, routePermitDoc, insuranceDoc] =
    await Promise.all([
      BrtaVehicleDocument.findOne({ registrationNumber: plate }).lean(),
      findLegacyBrtaDocument("brta_fitness_certificates", plate),
      findLegacyBrtaDocument("brta_tax_tokens", plate),
      findLegacyBrtaDocument("brta_route_permits", plate),
      findLegacyBrtaDocument("brta_insurance_certificates", plate),
    ]);

  const registrationCertificate = getCleanPart(
    documentBundle?.registrationCertificate,
    {}
  );

  const fitnessCertificate = getCleanPart(
    documentBundle?.fitnessCertificate,
    fitnessDoc || {}
  );

  const taxToken = getCleanPart(documentBundle?.taxToken, taxTokenDoc || {});

  const routePermit = getCleanPart(
    documentBundle?.routePermit,
    routePermitDoc || {}
  );

  const insurance = getCleanPart(
    documentBundle?.insurance,
    insuranceDoc || {}
  );

  return {
    ...(documentBundle || {}),
    registrationNumber: plate,

    registrationCertificate,
    fitnessCertificate,
    taxToken,
    routePermit,
    insurance,

    registrationExpiry: getExpiryDate(registrationCertificate),
    fitnessExpiry: getExpiryDate(fitnessCertificate),
    taxTokenExpiry: getExpiryDate(taxToken),
    routePermitExpiry: getExpiryDate(routePermit),
    insuranceExpiry: getExpiryDate(insurance),

    legacySources: {
      fitnessCertificate: Boolean(fitnessDoc),
      taxToken: Boolean(taxTokenDoc),
      routePermit: Boolean(routePermitDoc),
      insurance: Boolean(insuranceDoc),
    },
  };
};

const countUnpaidViolationsByPlate = async (registrationNumber) => {
  const plate = normalizePlate(registrationNumber);

  const appVehicle = await Vehicle.findOne({
    registrationNumber: plate,
  }).lean();

  const plateQuery = [
    { registrationNumber: plate },
    { vehicleRegistrationNumber: plate },
    { "vehicle.registrationNumber": plate },
  ];

  if (appVehicle?._id) {
    plateQuery.push({ vehicle: appVehicle._id });
  }

  return Violation.countDocuments({
    $and: [
      {
        $or: plateQuery,
      },
      {
        status: {
          $ne: "dismissed",
        },
      },
      {
        $or: [
          { paymentStatus: { $in: ["unpaid", "pending", "partial"] } },
          { status: { $in: ["pending", "approved", "unpaid"] } },
          { paid: false },
        ],
      },
    ],
  });
};

const getVehicleRegistryBundle = async (registrationNumber) => {
  const plate = normalizePlate(registrationNumber);

  const vehicle = await BrtaVehicle.findOne({
    registrationNumber: plate,
  }).lean();

  if (!vehicle) {
    return {
      found: false,
      registrationNumber: plate,
    };
  }

  const [owner, documents, blacklistRecords] = await Promise.all([
    vehicle.brtaOwnerId
      ? BrtaOwner.findOne({ brtaOwnerId: vehicle.brtaOwnerId }).lean()
      : null,

    getUnifiedVehicleDocuments(plate),
    BrtaBlacklistRecord.find({
      entityType: "vehicle",
      registrationNumber: plate,
      status: "active",
    }).lean(),
  ]);

  return {
    found: true,
    registrationNumber: plate,
    vehicle,
    owner,
    documents,
    blacklistRecords,
  };
};

const verifyDriverAuthorization = async ({ registrationNumber, licenseNumber }) => {
  const plate = normalizePlate(registrationNumber);
  const cleanLicense = normalizeLicense(licenseNumber);

  if (!cleanLicense) {
    return {
      checked: false,
      authorized: false,
      message: "Driver license was not provided for authorization check.",
    };
  }

  const authorization = await BrtaDriverVehicleAuthorization.findOne({
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    status: "active",
  }).lean();

  if (!authorization) {
    return {
      checked: true,
      authorized: false,
      licenseNumber: cleanLicense,
      message: "Driver is not authorized for this vehicle.",
    };
  }

  const now = new Date();

  if (authorization.endDate && new Date(authorization.endDate) < now) {
    return {
      checked: true,
      authorized: false,
      licenseNumber: cleanLicense,
      authorization,
      message: "Driver authorization is expired.",
    };
  }

  return {
    checked: true,
    authorized: true,
    licenseNumber: cleanLicense,
    authorization,
    message: "Driver is authorized for this vehicle.",
  };
};

const getAuthorizedDriversForVehicle = async (registrationNumber) => {
  const plate = normalizePlate(registrationNumber);

  const appVehicle = await Vehicle.findOne({
    registrationNumber: plate,
  })
    .select("_id")
    .lean();

  const assignmentVehicleQuery = [
    { registrationNumber: plate },
    { vehicleRegistrationNumber: plate },
  ];

  if (appVehicle?._id) {
    assignmentVehicleQuery.push({ vehicle: appVehicle._id });
  }

  const activeAssignments = await Assignment.find({
    status: "active",
    $or: assignmentVehicleQuery,
  })
    .populate(
      "driver",
      "name email role phone nid brtaDriverId licenseNumber avatar avatarUrl photo photoUrl image profileImage profilePhoto profilePicture cloudinaryUrl cloudinarySecureUrl picture"
    )
    .populate("license", "licenseNumber holderName licenseClass status")
    .lean();

  const legacyAssignments = appVehicle?._id
    ? await DriverAssignment.find({
      vehicle: appVehicle._id,
      status: "active",
    })
      .populate(
        "driver",
        "name email role phone nid brtaDriverId licenseNumber avatar avatarUrl photo photoUrl image profileImage profilePhoto profilePicture cloudinaryUrl cloudinarySecureUrl picture"
      )
      .lean()
    : [];

  const driverMap = new Map();

  activeAssignments.forEach((assignment) => {
    const driver = assignment.driver || {};
    const license = assignment.license || {};
    const licenseNumber = assignment.licenseNumber || license.licenseNumber || "";

    const key = String(
      driver._id ||
      assignment.driver ||
      licenseNumber ||
      assignment.brtaDriverId ||
      assignment._id
    );

    if (!key || driverMap.has(key)) {
      return;
    }

    driverMap.set(key, {
      _id: driver._id || undefined,
      name: license.holderName || driver.name || "Authorized Driver",
      email: driver.email || "",
      phone: driver.phone || "",
      nid: driver.nid || "",
      licenseNumber,
      licenseClass: license.licenseClass || "",
      licenseStatus: license.status || "valid",
      status: "authorized",
      authorizationStatus: "authorized",
      assignmentStatus: assignment.status,
      assignmentId: assignment._id,
      source: "ASSIGNMENT",
      brtaDriverId: assignment.brtaDriverId || driver.brtaDriverId || "",
      avatar: driver.avatar || "",
      avatarUrl:
        driver.avatarUrl ||
        driver.photoUrl ||
        driver.profileImage ||
        driver.profilePhoto ||
        driver.profilePicture ||
        driver.cloudinaryUrl ||
        driver.cloudinarySecureUrl ||
        driver.picture ||
        driver.image ||
        driver.photo ||
        "",
    });
  });

  legacyAssignments.forEach((assignment) => {
    const driver = assignment.driver || {};
    const licenseNumber = driver.licenseNumber || assignment.licenseNumber || "";

    const key = String(
      driver._id || assignment.driver || licenseNumber || assignment._id
    );

    if (!key || driverMap.has(key)) {
      return;
    }

    driverMap.set(key, {
      _id: driver._id || undefined,
      name: driver.name || "Authorized Driver",
      email: driver.email || "",
      phone: driver.phone || "",
      nid: driver.nid || "",
      licenseNumber,
      licenseClass: "",
      licenseStatus: "valid",
      status: "authorized",
      authorizationStatus: "authorized",
      assignmentStatus: assignment.status,
      assignmentId: assignment._id,
      source: "LEGACY_DRIVER_ASSIGNMENT",
      brtaDriverId: driver.brtaDriverId || "",
      avatar: driver.avatar || "",
      avatarUrl:
        driver.avatarUrl ||
        driver.photoUrl ||
        driver.profileImage ||
        driver.profilePhoto ||
        driver.profilePicture ||
        driver.cloudinaryUrl ||
        driver.cloudinarySecureUrl ||
        driver.picture ||
        driver.image ||
        driver.photo ||
        "",
    });
  });

  return Array.from(driverMap.values());
};

const verifyVehicle = async ({ registrationNumber, licenseNumber }) => {
  const plate = normalizePlate(registrationNumber);

  const bundle = await getVehicleRegistryBundle(plate);

  if (!bundle.found) {
    return {
      found: false,
      registrationNumber: plate,
      dataSource: "BRTA_MOCK",
      brtaProvider: env.brtaProviderName,
      checkedAt: new Date().toISOString(),
      verification: {
        result: "not_found",
        isCompliant: false,
        safetyScore: 0,
        complianceScore: 0,
        riskLevel: "Critical Risk",
        issues: [
          {
            code: "VEHICLE_NOT_FOUND",
            message: "Vehicle was not found in Mock BRTA Registry.",
            severity: "critical",
            penalty: 100,
          },
        ],
      },
    };
  }

  const unpaidViolationsCount = await countUnpaidViolationsByPlate(plate);

  const safety = calculateVehicleSafetyScore({
    vehicle: bundle.vehicle,
    documents: bundle.documents,
    blacklistRecords: bundle.blacklistRecords,
    unpaidViolationsCount,
  });

  const [driverAuthorization, authorizedDrivers] = await Promise.all([
    verifyDriverAuthorization({
      registrationNumber: plate,
      licenseNumber,
    }),
    getAuthorizedDriversForVehicle(plate),
  ]);

  const documents = bundle.documents || {};

  const vehicle = {
    ...bundle.vehicle,
    qrCode: bundle.vehicle.qrCode || buildVehicleQR(plate),
    documents,
    owner: bundle.owner || null,

    registrationExpiry:
      bundle.vehicle.registrationExpiry ||
      documents.registrationExpiry ||
      documents.registrationCertificate?.expiryDate ||
      null,

    fitnessExpiry:
      bundle.vehicle.fitnessExpiry ||
      documents.fitnessExpiry ||
      documents.fitnessCertificate?.expiryDate ||
      null,

    taxTokenExpiry:
      bundle.vehicle.taxTokenExpiry ||
      documents.taxTokenExpiry ||
      documents.taxToken?.expiryDate ||
      null,

    routePermitExpiry:
      bundle.vehicle.routePermitExpiry ||
      documents.routePermitExpiry ||
      documents.routePermit?.expiryDate ||
      null,

    insuranceExpiry:
      bundle.vehicle.insuranceExpiry ||
      documents.insuranceExpiry ||
      documents.insurance?.expiryDate ||
      null,

    assignedDrivers: authorizedDrivers,
    authorizedDrivers,
    assignedDriverCount: authorizedDrivers.length,

    safetyScore: safety.score,
    complianceScore: safety.complianceScore,
    riskLevel: safety.riskLevel,
  };

  return {
    found: true,
    registrationNumber: plate,
    dataSource: "BRTA_MOCK",
    brtaProvider: env.brtaProviderName,
    checkedAt: new Date().toISOString(),

    vehicle,
    owner: bundle.owner || null,
    documents,
    driverAuthorization,
    authorizedDrivers,
    drivers: authorizedDrivers,

    verification: {
      result: safety.isCompliant ? "valid" : "warning",
      isCompliant: safety.isCompliant,
      safetyScore: safety.score,
      complianceScore: safety.complianceScore,
      riskLevel: safety.riskLevel,
      issues: safety.issues,
      unpaidViolationsCount,
    },

    safetyScore: safety.score,
    complianceScore: safety.complianceScore,
    riskLevel: safety.riskLevel,
    issues: safety.issues,
  };
};

const getAllVehicles = async () => {
  const vehicles = await BrtaVehicle.find({}).sort({ createdAt: -1 }).lean();

  const result = [];

  for (const vehicle of vehicles) {
    const verified = await verifyVehicle({
      registrationNumber: vehicle.registrationNumber,
    });

    result.push(verified.vehicle);
  }

  return result;
};

const getOwnerVehicles = async (user) => {
  const result = [];

  // Option 1: STVES app vehicle owner relation
  const appVehicles = await Vehicle.find({
    owner: user._id,
  }).lean();

  for (const appVehicle of appVehicles) {
    const plate = appVehicle.registrationNumber || appVehicle.plateNumber;

    if (!plate) continue;

    const verified = await verifyVehicle({
      registrationNumber: plate,
    });

    if (verified.found) {
      result.push({
        ...verified.vehicle,
        appVehicleId: appVehicle._id,
      });
    }
  }

  // Option 2: BRTA owner relation by NID
  if (user.nid) {
    const brtaOwner = await BrtaOwner.findOne({
      nid: user.nid,
    }).lean();

    if (brtaOwner?.brtaOwnerId) {
      const brtaVehicles = await BrtaVehicle.find({
        brtaOwnerId: brtaOwner.brtaOwnerId,
      }).lean();

      for (const vehicle of brtaVehicles) {
        const alreadyExists = result.some(
          (item) => item.registrationNumber === vehicle.registrationNumber
        );

        if (alreadyExists) continue;

        const verified = await verifyVehicle({
          registrationNumber: vehicle.registrationNumber,
        });

        if (verified.found) {
          result.push(verified.vehicle);
        }
      }
    }
  }

  return result;
};

module.exports = {
  verifyVehicle,
  getAllVehicles,
  getOwnerVehicles,
  getUnifiedVehicleDocuments,
};