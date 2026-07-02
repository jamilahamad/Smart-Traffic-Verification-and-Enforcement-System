const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const AppError = require("../utils/AppError");
const { uploadImageBuffer } = require("./cloudinary.service");
const DrivingLicense = require("../models/DrivingLicense");
const Violation = require("../models/Violation");
const Assignment = require("../models/Assignment");

const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaOwner = require("../models/BrtaOwner");
const BrtaDriver = require("../models/BrtaDriver");

const analyticsService = require("./analytics.service");
const userService = require("./user.service");

const getDashboard = async () => {
  const analytics = await analyticsService.getAnalyticsSummary();

  return {
    ...analytics,
    summary: {
      users: analytics.totalUsers,

      vehicles: analytics.totalBrtaVehicles,
      brtaVehicleRecords: analytics.totalBrtaVehicles,
      activeBrtaVehicles: analytics.activeBrtaVehicles,
      stvesRegisteredVehicles: analytics.totalVehicles,
      activeStvesRegisteredVehicles: analytics.activeVehicles,

      licenses: analytics.totalBrtaLicenses,
      stvesLicenses: analytics.totalLicenses,

      violations: analytics.totalViolations,
      pendingCases: analytics.pendingCases,
      paidRevenue: analytics.paidRevenue,
      activeAssignments: analytics.activeAssignments,
    },
  };
};

const getAdminUsers = async (filters = {}) => {
  return userService.getUsers(filters);
};

const createAdminUser = async (payload) => {
  return userService.createUser(payload);
};

const updateAdminUser = async (id, payload) => {
  return userService.updateUser(id, payload);
};

const getAdminVehicles = async (filters = {}) => {
  const appQuery = {};
  const brtaQuery = {};

  if (filters.status) {
    appQuery.status = filters.status;
    brtaQuery.status = filters.status;
  }

  if (filters.registrationNumber) {
    const plate = String(filters.registrationNumber).trim().toUpperCase();
    appQuery.registrationNumber = plate;
    brtaQuery.registrationNumber = plate;
  }

  const [appVehicles, brtaVehicles] = await Promise.all([
    Vehicle.find(appQuery)
      .populate("owner", "name email phone nid role status")
      .sort({ createdAt: -1 })
      .lean(),

    BrtaVehicle.find(brtaQuery).sort({ createdAt: -1 }).lean(),
  ]);

  const brtaOwnerIds = [
    ...new Set(brtaVehicles.map((v) => v.brtaOwnerId).filter(Boolean)),
  ];

  const brtaOwners = await BrtaOwner.find({
    brtaOwnerId: { $in: brtaOwnerIds },
  }).lean();

  const ownerMap = new Map(
    brtaOwners.map((owner) => [owner.brtaOwnerId, owner])
  );

  const appData = appVehicles.map((vehicle) => ({
    ...vehicle,
    source: "STVES_APP",
  }));

  const brtaData = brtaVehicles.map((vehicle) => ({
    ...vehicle,
    owner: ownerMap.get(vehicle.brtaOwnerId) || null,
    source: "BRTA_MOCK",
  }));

  return {
    count: appData.length + brtaData.length,
    appCount: appData.length,
    brtaCount: brtaData.length,
    vehicles: [...appData, ...brtaData],
  };
};

const getAdminLicenses = async (filters = {}) => {
  const appQuery = {};
  const brtaQuery = {};

  if (filters.status) {
    appQuery.status = filters.status;
    brtaQuery.status = filters.status;
  }

  if (filters.licenseNumber) {
    const license = String(filters.licenseNumber).trim().toUpperCase();
    appQuery.licenseNumber = license;
    brtaQuery.licenseNumber = license;
  }

  const [appLicenses, brtaLicenses] = await Promise.all([
    DrivingLicense.find(appQuery)
      .populate("driver", "name email phone nid role status")
      .sort({ createdAt: -1 })
      .lean(),

    BrtaDrivingLicense.find(brtaQuery).sort({ createdAt: -1 }).lean(),
  ]);

  const brtaDriverIds = [
    ...new Set(brtaLicenses.map((l) => l.brtaDriverId).filter(Boolean)),
  ];

  const brtaDrivers = await BrtaDriver.find({
    brtaDriverId: { $in: brtaDriverIds },
  }).lean();

  const driverMap = new Map(
    brtaDrivers.map((driver) => [driver.brtaDriverId, driver])
  );

  const appData = appLicenses.map((license) => ({
    ...license,
    source: "STVES_APP",
  }));

  const brtaData = brtaLicenses.map((license) => ({
    ...license,
    driver: driverMap.get(license.brtaDriverId) || null,
    source: "BRTA_MOCK",
  }));

  return {
    count: appData.length + brtaData.length,
    appCount: appData.length,
    brtaCount: brtaData.length,
    licenses: [...appData, ...brtaData],
  };
};

const getAdminCases = async (filters = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

  const cases = await Violation.find(query)
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .populate("adminReviewedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return cases;
};

const getAdminAssignments = async (filters = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;

  const assignments = await Assignment.find(query)
    .populate("vehicle", "registrationNumber brand model color vehicleType owner")
    .populate("driver", "name email role phone nid")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("owner", "name email role phone nid")
    .populate("assignedBy", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  return assignments;
};

const uniqueStrings = (values = []) => {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
};

const uploadBrtaDriverPhoto = async (brtaDriverId, file) => {
  const driver = await BrtaDriver.findOne({ brtaDriverId });

  if (!driver) {
    throw new AppError("BRTA driver not found.", 404);
  }

  const uploaded = await uploadImageBuffer(file, {
    folder: "stves/brta/drivers",
    publicId: driver.brtaDriverId,
  });

  driver.photoUrl = uploaded.secureUrl;
  driver.photoPublicId = uploaded.publicId;

  await driver.save();

  const brtaLicenseQueries = [{ brtaDriverId: driver.brtaDriverId }];

  if (driver.nid) {
    brtaLicenseQueries.push({ nid: driver.nid });
  }

  const brtaLicenses = await BrtaDrivingLicense.find({
    $or: brtaLicenseQueries,
  })
    .select("licenseNumber brtaDriverId nid")
    .lean();

  const licenseNumbers = uniqueStrings(
    brtaLicenses.map((license) => license.licenseNumber)
  );

  const appLicenses =
    licenseNumbers.length > 0
      ? await DrivingLicense.find({
        licenseNumber: { $in: licenseNumbers },
      })
        .select("driver licenseNumber")
        .lean()
      : [];

  const linkedDriverUserIds = appLicenses
    .map((license) => license.driver)
    .filter(Boolean);

  const matchConditions = [{ brtaDriverId: driver.brtaDriverId }];

  if (driver.nid) {
    matchConditions.push({ nid: driver.nid });
  }

  if (driver.phone) {
    matchConditions.push({ phone: driver.phone });
  }

  if (licenseNumbers.length > 0) {
    matchConditions.push({ licenseNumber: { $in: licenseNumbers } });
  }

  if (linkedDriverUserIds.length > 0) {
    matchConditions.push({ _id: { $in: linkedDriverUserIds } });
  }

  const userAvatarUpdate = {
    brtaDriverId: driver.brtaDriverId,
    avatarUrl: uploaded.secureUrl,
    avatarPublicId: uploaded.publicId,
    avatarSource: "brta",
  };

  if (licenseNumbers.length === 1) {
    userAvatarUpdate.licenseNumber = licenseNumbers[0];
  }

  const syncResult = await User.updateMany(
    {
      role: "driver",
      $or: matchConditions,
    },
    {
      $set: userAvatarUpdate,
    }
  );

  return {
    brtaDriverId: driver.brtaDriverId,
    name: driver.name,
    nid: driver.nid,
    phone: driver.phone,
    photoUrl: driver.photoUrl,
    photoPublicId: driver.photoPublicId,
    matchedLicenseNumbers: licenseNumbers,
    linkedAppUsers: linkedDriverUserIds.length,
    syncedUsers: syncResult.modifiedCount || 0,
  };
};

const uploadBrtaOwnerPhoto = async (brtaOwnerId, file) => {
  const owner = await BrtaOwner.findOne({ brtaOwnerId });

  if (!owner) {
    throw new AppError("BRTA owner not found.", 404);
  }

  const uploaded = await uploadImageBuffer(file, {
    folder: "stves/brta/owners",
    publicId: owner.brtaOwnerId,
  });

  owner.photoUrl = uploaded.secureUrl;
  owner.photoPublicId = uploaded.publicId;

  await owner.save();

  const matchConditions = [{ brtaOwnerId: owner.brtaOwnerId }];

  if (owner.nid) matchConditions.push({ nid: owner.nid });
  if (owner.phone) matchConditions.push({ phone: owner.phone });

  const syncResult = await User.updateMany(
    {
      role: "owner",
      $or: matchConditions,
    },
    {
      $set: {
        brtaOwnerId: owner.brtaOwnerId,
        avatarUrl: uploaded.secureUrl,
        avatarPublicId: uploaded.publicId,
        avatarSource: "brta",
      },
    }
  );

  return {
    brtaOwnerId: owner.brtaOwnerId,
    name: owner.name,
    nid: owner.nid,
    phone: owner.phone,
    photoUrl: owner.photoUrl,
    photoPublicId: owner.photoPublicId,
    syncedUsers: syncResult.modifiedCount || 0,
  };
};

module.exports = {
  getDashboard,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  getAdminVehicles,
  getAdminLicenses,
  getAdminCases,
  getAdminAssignments,
  uploadBrtaDriverPhoto,
  uploadBrtaOwnerPhoto,
};