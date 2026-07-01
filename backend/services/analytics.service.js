const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const DrivingLicense = require("../models/DrivingLicense");
const Violation = require("../models/Violation");
const Assignment = require("../models/Assignment");
const VerificationLog = require("../models/VerificationLog");

const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaOwner = require("../models/BrtaOwner");
const BrtaDriver = require("../models/BrtaDriver");

const getAnalyticsSummary = async () => {
  const [
    totalUsers,
    totalAdmins,
    totalPolice,
    totalDrivers,
    totalOwners,

    totalVehicles,
    totalLicenses,

    totalBrtaVehicles,
    totalBrtaLicenses,
    totalBrtaOwners,
    totalBrtaDrivers,

    totalViolations,
    pendingCases,
    approvedCases,
    dismissedCases,
    paidCases,

    unpaidPaymentCases,
    paidPaymentCases,

    activeAssignments,
    removedAssignments,

    totalVerificationLogs,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ role: "police" }),
    User.countDocuments({ role: "driver" }),
    User.countDocuments({ role: "owner" }),

    Vehicle.countDocuments(),
    DrivingLicense.countDocuments(),

    BrtaVehicle.countDocuments(),
    BrtaDrivingLicense.countDocuments(),
    BrtaOwner.countDocuments(),
    BrtaDriver.countDocuments(),

    Violation.countDocuments(),
    Violation.countDocuments({ status: "pending" }),
    Violation.countDocuments({ status: "approved" }),
    Violation.countDocuments({ status: "dismissed" }),
    Violation.countDocuments({ status: "paid" }),

    Violation.countDocuments({
      paymentStatus: { $in: ["unpaid", "pending", "partial"] },
      status: { $ne: "dismissed" },
    }),

    Violation.countDocuments({
      $or: [{ paymentStatus: "paid" }, { status: "paid" }],
    }),

    Assignment.countDocuments({ status: "active" }),
    Assignment.countDocuments({ status: "removed" }),

    VerificationLog.countDocuments(),
  ]);

  const fineAgg = await Violation.aggregate([
    {
      $group: {
        _id: null,
        totalFines: { $sum: "$fineAmount" },
        paidRevenue: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$paymentStatus", "paid"] },
                  { $eq: ["$status", "paid"] },
                ],
              },
              "$fineAmount",
              0,
            ],
          },
        },
        unpaidFines: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "dismissed"] },
                  { $ne: ["$paymentStatus", "paid"] },
                  { $ne: ["$status", "paid"] },
                ],
              },
              "$fineAmount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const violationStatusBreakdown = await Violation.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const violationTypeBreakdown = await Violation.aggregate([
    {
      $group: {
        _id: "$violationType",
        count: { $sum: 1 },
        totalFine: { $sum: "$fineAmount" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const recentViolations = await Violation.find({})
    .populate("vehicle", "registrationNumber brand model")
    .populate("driver", "name email")
    .populate("license", "licenseNumber holderName")
    .populate("officer", "name email badge")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const recentVerificationLogs = await VerificationLog.find({})
    .populate("officer", "name email role badge")
    .populate("user", "name email role badge")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const fineSummary = fineAgg[0] || {
    totalFines: 0,
    paidRevenue: 0,
    unpaidFines: 0,
  };

  return {
    totalUsers,
    totalAdmins,
    totalPolice,
    totalDrivers,
    totalOwners,

    totalVehicles,
    totalLicenses,

    totalBrtaVehicles,
    totalBrtaLicenses,
    totalBrtaOwners,
    totalBrtaDrivers,

    totalViolations,
    pendingCases,
    approvedCases,
    dismissedCases,
    paidCases,

    unpaidCases: unpaidPaymentCases,
    paidPaymentCases,

    activeAssignments,
    removedAssignments,

    totalVerificationLogs,

    totalFines: fineSummary.totalFines || 0,
    paidRevenue: fineSummary.paidRevenue || 0,
    unpaidFines: fineSummary.unpaidFines || 0,

    violationStatusBreakdown,
    violationTypeBreakdown,

    recentViolations,
    recentVerificationLogs,
  };
};

module.exports = {
  getAnalyticsSummary,
};