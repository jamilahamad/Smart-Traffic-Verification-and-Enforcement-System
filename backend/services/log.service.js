const VerificationLog = require("../models/VerificationLog");
const AuditLog = require("../models/AuditLog");

const { normalizePlate, normalizeLicense } = require("../utils/qr");

const normalizeIssueList = (issues = []) => {
  if (!Array.isArray(issues)) return [];

  return issues.map((issue) => {
    if (typeof issue === "string") {
      return {
        code: "ISSUE",
        message: issue,
        severity: "warning",
        penalty: 0,
      };
    }

    return {
      code: issue.code || "ISSUE",
      message: issue.message || "Issue detected.",
      severity: issue.severity || "warning",
      penalty: Number(issue.penalty || 0),
    };
  });
};

const createVerificationLog = async ({
  req,
  user,
  searchType,
  searchValue,
  registrationNumber,
  licenseNumber,
  result,
  dataSource = "BRTA_MOCK",
  brtaProvider = "Mock BRTA Registry",
  verification = {},
  issues = [],
}) => {
  try {
    const normalizedType = searchType || "qr";

    const log = await VerificationLog.create({
      officer: user?._id || null,
      user: user?._id || null,

      searchType: normalizedType,
      type: normalizedType,

      searchValue,
      query: searchValue,

      registrationNumber: registrationNumber
        ? normalizePlate(registrationNumber)
        : undefined,

      licenseNumber: licenseNumber ? normalizeLicense(licenseNumber) : undefined,

      dataSource,
      brtaProvider,

      result:
        result ||
        verification.result ||
        (verification.isCompliant ? "valid" : "warning"),

      isCompliant: Boolean(verification.isCompliant),

      safetyScore: verification.safetyScore ?? verification.score,
      complianceScore:
        verification.complianceScore ?? verification.safetyScore ?? verification.score,

      riskLevel: verification.riskLevel,

      verification: {
        result: verification.result,
        isCompliant: Boolean(verification.isCompliant),
        safetyScore: verification.safetyScore ?? verification.score,
        complianceScore:
          verification.complianceScore ??
          verification.safetyScore ??
          verification.score,
        riskLevel: verification.riskLevel,
      },

      issues: normalizeIssueList(issues || verification.issues),

      deviceInfo: {
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
      },
    });

    return log;
  } catch (error) {
    console.error("Verification log create failed:", error.message);
    return null;
  }
};

const createAuditLog = async ({
  req,
  actor,
  action,
  module = "system",
  entityType,
  entityId,
  before,
  after,
  message,
}) => {
  try {
    const log = await AuditLog.create({
      actor: actor?._id || null,
      actorRole: actor?.role || "system",
      action,
      module,
      entityType,
      entityId,
      before,
      after,
      message,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });

    return log;
  } catch (error) {
    console.error("Audit log create failed:", error.message);
    return null;
  }
};

const getVerificationLogs = async ({ user, filters = {} }) => {
  const query = {};

  if (user.role === "police") {
    query.$or = [{ officer: user._id }, { user: user._id }];
  }

  if (filters.searchType) {
    query.searchType = filters.searchType;
  }

  if (filters.type) {
    query.$or = [
      ...(query.$or || []),
      { searchType: filters.type },
      { type: filters.type },
    ];
  }

  if (filters.result) {
    query.result = filters.result;
  }

  if (filters.registrationNumber) {
    query.registrationNumber = normalizePlate(filters.registrationNumber);
  }

  if (filters.licenseNumber) {
    query.licenseNumber = normalizeLicense(filters.licenseNumber);
  }

  const limit = Math.min(Number(filters.limit || 100), 500);

  const logs = await VerificationLog.find(query)
    .populate("officer", "name email role badge station")
    .populate("user", "name email role badge station")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return logs;
};

const getMyVerificationLogs = async ({ user, filters = {} }) => {
  const query = {
    $or: [{ officer: user._id }, { user: user._id }],
  };

  if (filters.searchType) {
    query.searchType = filters.searchType;
  }

  const limit = Math.min(Number(filters.limit || 100), 500);

  return VerificationLog.find(query)
    .populate("officer", "name email role badge station")
    .populate("user", "name email role badge station")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

const getAuditLogs = async ({ filters = {} }) => {
  const query = {};

  if (filters.module) {
    query.module = filters.module;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  const limit = Math.min(Number(filters.limit || 100), 500);

  return AuditLog.find(query)
    .populate("actor", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

const getActivityLogs = async ({ user, filters = {} }) => {
  const [verificationLogs, auditLogs] = await Promise.all([
    getVerificationLogs({ user, filters }),
    user.role === "admin" ? getAuditLogs({ filters }) : [],
  ]);

  const activities = [
    ...verificationLogs.map((item) => ({
      _id: item._id,
      logType: "verification",
      title: `${item.searchType || item.type || "verification"} verification`,
      message: `${item.searchValue || item.query || "N/A"} - ${
        item.result || "unknown"
      }`,
      actor: item.officer || item.user || null,
      module: "verification",
      createdAt: item.createdAt,
      raw: item,
    })),

    ...auditLogs.map((item) => ({
      _id: item._id,
      logType: "audit",
      title: item.action,
      message: item.message || item.action,
      actor: item.actor || null,
      module: item.module,
      createdAt: item.createdAt,
      raw: item,
    })),
  ];

  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return activities.slice(0, Math.min(Number(filters.limit || 100), 500));
};

module.exports = {
  createVerificationLog,
  createAuditLog,
  getVerificationLogs,
  getMyVerificationLogs,
  getAuditLogs,
  getActivityLogs,
};