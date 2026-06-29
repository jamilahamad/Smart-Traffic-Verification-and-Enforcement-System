const BrtaDriver = require("../models/BrtaDriver");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaLicenseClass = require("../models/BrtaLicenseClass");
const BrtaBlacklistRecord = require("../models/BrtaBlacklistRecord");

const Assignment = require("../models/Assignment");
const DrivingLicense = require("../models/DrivingLicense");
const Vehicle = require("../models/Vehicle");
const Violation = require("../models/Violation");

const env = require("../config/env");
const { normalizePlate, normalizeLicense, buildLicenseQR } = require("../utils/qr");
const { calculateLicenseSafetyScore } = require("./safetyScore.service");

const countUnpaidViolationsByLicense = async (licenseNumber) => {
  const cleanLicense = normalizeLicense(licenseNumber);

  const appLicense = await DrivingLicense.findOne({
    licenseNumber: cleanLicense,
  }).lean();

  const licenseQuery = [
    { licenseNumber: cleanLicense },
    { driverLicenseNumber: cleanLicense },
    { "license.licenseNumber": cleanLicense },
  ];

  if (appLicense?._id) {
    licenseQuery.push({ license: appLicense._id });

    if (appLicense.driver) {
      licenseQuery.push({ driver: appLicense.driver });
    }
  }

  return Violation.countDocuments({
    $and: [
      {
        $or: licenseQuery,
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

const getLicenseRegistryBundle = async (licenseNumber) => {
  const cleanLicense = normalizeLicense(licenseNumber);

  const license = await BrtaDrivingLicense.findOne({
    licenseNumber: cleanLicense,
  }).lean();

  if (!license) {
    return {
      found: false,
      licenseNumber: cleanLicense,
    };
  }

  const [driver, licenseClass, blacklistRecords] = await Promise.all([
    license.brtaDriverId
      ? BrtaDriver.findOne({ brtaDriverId: license.brtaDriverId }).lean()
      : null,

    license.licenseClass
      ? BrtaLicenseClass.findOne({
        classCode: String(license.licenseClass).toLowerCase(),
      }).lean()
      : null,

    BrtaBlacklistRecord.find({
      status: "active",
      $or: [
        {
          entityType: "license",
          licenseNumber: cleanLicense,
        },
        {
          entityType: "driver",
          brtaDriverId: license.brtaDriverId,
        },
      ],
    }).lean(),
  ]);

  return {
    found: true,
    licenseNumber: cleanLicense,
    license,
    driver,
    licenseClass,
    blacklistRecords,
  };
};

const getAuthorizedVehiclesForLicense = async (licenseNumber, bundle = {}) => {
  const cleanLicense = normalizeLicense(licenseNumber);

  if (!cleanLicense) {
    return [];
  }

  const brtaDriverId =
    bundle.license?.brtaDriverId ||
    bundle.driver?.brtaDriverId ||
    "";

  const appLicense = await DrivingLicense.findOne({
    licenseNumber: cleanLicense,
  })
    .select("_id driver")
    .lean();

  const assignmentQuery = [
    { licenseNumber: cleanLicense },
  ];

  if (appLicense?._id) {
    assignmentQuery.push({ license: appLicense._id });
  }

  if (appLicense?.driver) {
    assignmentQuery.push({ driver: appLicense.driver });
  }

  if (brtaDriverId) {
    assignmentQuery.push({ brtaDriverId });
  }

  const activeAssignments = await Assignment.find({
    status: "active",
    $or: assignmentQuery,
  })
    .populate(
      "vehicle",
      "registrationNumber vehicleType brand model year color status safetyScore complianceScore riskLevel qrCode"
    )
    .lean();

  const rowMap = new Map();

  activeAssignments.forEach((assignment) => {
    const populatedVehicle =
      assignment.vehicle && typeof assignment.vehicle === "object"
        ? assignment.vehicle
        : null;

    const plate = normalizePlate(
      populatedVehicle?.registrationNumber ||
      assignment.registrationNumber ||
      assignment.vehicleRegistrationNumber ||
      ""
    );

    if (!plate || rowMap.has(plate)) {
      return;
    }

    rowMap.set(plate, {
      plate,
      assignment,
      populatedVehicle,
    });
  });

  const rows = Array.from(rowMap.values());
  const plates = rows.map((row) => row.plate);

  if (plates.length === 0) {
    return [];
  }

  const appVehicles = await Vehicle.find({
    registrationNumber: { $in: plates },
  }).lean();

  const appVehicleMap = new Map(
    appVehicles.map((vehicle) => [
      normalizePlate(vehicle.registrationNumber),
      vehicle,
    ])
  );

  return rows.map((row) => {
    const sourceVehicle =
      row.populatedVehicle ||
      appVehicleMap.get(row.plate) ||
      {};

    return {
      _id: sourceVehicle._id || undefined,
      registrationNumber: row.plate,
      plateNumber: row.plate,
      qrCode: sourceVehicle.qrCode || `STVES-VEH:${row.plate}`,
      vehicleType: sourceVehicle.vehicleType || "N/A",
      brand: sourceVehicle.brand || "N/A",
      model: sourceVehicle.model || "",
      year: sourceVehicle.year || "",
      color: sourceVehicle.color || "",
      status: sourceVehicle.status || "active",
      safetyScore: sourceVehicle.safetyScore ?? 100,
      complianceScore: sourceVehicle.complianceScore ?? 100,
      riskLevel: sourceVehicle.riskLevel || "Low Risk",
      assignmentStatus: row.assignment?.status || "active",
      assignmentId: row.assignment?._id || undefined,
      authorizationStatus: "authorized",
      authorizationType: row.assignment?.driverSource || "STVES_ACCOUNT",
    };
  });
};

const verifyLicense = async ({ licenseNumber }) => {
  const cleanLicense = normalizeLicense(licenseNumber);

  const bundle = await getLicenseRegistryBundle(cleanLicense);

  if (!bundle.found) {
    return {
      found: false,
      licenseNumber: cleanLicense,
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
            code: "LICENSE_NOT_FOUND",
            message: "Driving license was not found in Mock BRTA Registry.",
            severity: "critical",
            penalty: 100,
          },
        ],
      },
    };
  }

  const unpaidViolationsCount = await countUnpaidViolationsByLicense(cleanLicense);

  const safety = calculateLicenseSafetyScore({
    license: bundle.license,
    driver: bundle.driver,
    blacklistRecords: bundle.blacklistRecords,
    unpaidViolationsCount,
  });

  const license = {
    ...bundle.license,
    qrCode: bundle.license.qrCode || buildLicenseQR(cleanLicense),
    driver: bundle.driver || null,
    licenseClassInfo: bundle.licenseClass || null,
    safetyScore: safety.score,
    complianceScore: safety.complianceScore,
    riskLevel: safety.riskLevel,
  };

  const authorizedVehicles = await getAuthorizedVehiclesForLicense(
    cleanLicense,
    bundle
  );

  return {
    found: true,
    licenseNumber: cleanLicense,
    dataSource: "BRTA_MOCK",
    brtaProvider: env.brtaProviderName,
    checkedAt: new Date().toISOString(),

    license,
    driver: bundle.driver || null,
    licenseClass: bundle.licenseClass || null,
    authorizedVehicles,
    vehicles: authorizedVehicles,

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

const getEffectiveBrtaLicenseStatus = (license = {}) => {
  const brtaStatus = String(license.status || "valid").toLowerCase();

  if (["suspended", "blacklisted", "expired"].includes(brtaStatus)) {
    return brtaStatus;
  }

  if (license.expiryDate) {
    const expiryDate = new Date(license.expiryDate);
    const today = new Date();

    expiryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (!Number.isNaN(expiryDate.getTime()) && expiryDate < today) {
      return "expired";
    }
  }

  return brtaStatus || "valid";
};

const applyOfficialBrtaStatus = (license = {}) => {
  return {
    ...license,
    status: getEffectiveBrtaLicenseStatus(license),
  };
};

const getAllLicenses = async () => {
  const licenses = await BrtaDrivingLicense.find({}).sort({ createdAt: -1 }).lean();

  const result = [];

  for (const license of licenses) {
    const verified = await verifyLicense({
      licenseNumber: license.licenseNumber,
    });

    if (verified.found) {
      result.push(verified.license);
    }
  }

  return result;
};

const getMyLicenses = async (user) => {
  const result = [];

  const appLicenses = await DrivingLicense.find({
    driver: user._id,
  }).lean();

  const appLicenseMap = new Map();

  for (const appLicense of appLicenses) {
    const cleanLicense = normalizeLicense(appLicense.licenseNumber);

    if (cleanLicense) {
      appLicenseMap.set(cleanLicense, appLicense);
    }
  }

  const pushOfficialLicense = async (licenseNumber) => {
    const cleanLicense = normalizeLicense(licenseNumber);

    if (!cleanLicense) {
      return;
    }

    const alreadyExists = result.some((item) => {
      return normalizeLicense(item.licenseNumber) === cleanLicense;
    });

    if (alreadyExists) {
      return;
    }

    const verified = await verifyLicense({
      licenseNumber: cleanLicense,
    });

    if (!verified.found) {
      return;
    }

    const linkedAppLicense = appLicenseMap.get(cleanLicense);

    result.push({
      ...applyOfficialBrtaStatus(verified.license),

      appLicenseId: linkedAppLicense?._id,
      appLicenseStatus: linkedAppLicense?.status,
      appLicenseSyncedAt: linkedAppLicense?.updatedAt,
    });
  };

  if (user.nid) {
    const brtaDriver = await BrtaDriver.findOne({
      nid: user.nid,
    }).lean();

    if (brtaDriver?.brtaDriverId) {
      const brtaLicenses = await BrtaDrivingLicense.find({
        brtaDriverId: brtaDriver.brtaDriverId,
      }).lean();

      for (const brtaLicense of brtaLicenses) {
        await pushOfficialLicense(brtaLicense.licenseNumber);
      }
    }
  }

  for (const appLicense of appLicenses) {
    await pushOfficialLicense(appLicense.licenseNumber);
  }

  return result;
};

module.exports = {
  verifyLicense,
  getAllLicenses,
  getMyLicenses,
};