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

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getAnalyticsSummary = async () => {
  const [
    totalUsers,
    totalAdmins,
    totalPolice,
    totalDrivers,
    totalOwners,

    totalVehicles,
    activeVehicles,
    suspendedVehicles,
    blacklistedVehicles,

    totalLicenses,
    validLicenses,
    expiredLicenses,

    totalBrtaVehicles,
    activeBrtaVehicles,
    suspendedBrtaVehicles,
    blacklistedBrtaVehicles,

    totalBrtaLicenses,
    totalBrtaOwners,
    totalBrtaDrivers,

    totalViolations,
    pendingCases,
    approvedCases,
    dismissedCases,
    paidStatusCases,

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
    Vehicle.countDocuments({ status: "active" }),
    Vehicle.countDocuments({ status: "suspended" }),
    Vehicle.countDocuments({ status: "blacklisted" }),

    DrivingLicense.countDocuments(),
    DrivingLicense.countDocuments({ status: { $in: ["valid", "active"] } }),
    DrivingLicense.countDocuments({ status: "expired" }),

    BrtaVehicle.countDocuments(),
    BrtaVehicle.countDocuments({ status: "active" }),
    BrtaVehicle.countDocuments({ status: "suspended" }),
    BrtaVehicle.countDocuments({ status: "blacklisted" }),

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
      status: { $nin: ["dismissed", "paid"] },
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
        _id: { $ifNull: ["$status", "unknown"] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const violationTypeBreakdown = await Violation.aggregate([
    {
      $project: {
        fineAmount: 1,
        label: {
          $ifNull: [
            "$violationCode",
            {
              $ifNull: [
                "$ruleCode",
                {
                  $ifNull: ["$violationType", "Other"],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$label",
        count: { $sum: 1 },
        totalFine: { $sum: "$fineAmount" },
      },
    },
    { $sort: { count: -1, totalFine: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        label: "$_id",
        value: "$count",
        count: "$count",
        totalFine: "$totalFine",
      },
    },
  ]);

  const monthlyCaseTrend = await Violation.aggregate([
    {
      $group: {
        _id: { $month: "$createdAt" },
        value: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        monthNumber: "$_id",
        label: {
          $arrayElemAt: [MONTH_LABELS, { $subtract: ["$_id", 1] }],
        },
        value: 1,
      },
    },
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
    activeVehicles,
    suspendedVehicles,
    blacklistedVehicles,

    totalLicenses,
    validLicenses,
    expiredLicenses,

    totalBrtaVehicles,
    activeBrtaVehicles,
    suspendedBrtaVehicles,
    blacklistedBrtaVehicles,

    totalVehicleRecords: Math.max(totalVehicles, totalBrtaVehicles),
    activeVehicleRecords: Math.max(activeVehicles, activeBrtaVehicles),

    totalBrtaLicenses,
    totalBrtaOwners,
    totalBrtaDrivers,

    totalViolations,
    pendingCases,
    approvedCases,
    dismissedCases,
    paidCases: paidPaymentCases,
    paidStatusCases,

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
    monthlyCaseTrend,

    recentViolations,
    recentVerificationLogs,
  };
};

module.exports = {
  getAnalyticsSummary,
};