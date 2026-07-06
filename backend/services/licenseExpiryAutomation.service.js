const DrivingLicense = require("../models/DrivingLicense");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Violation = require("../models/Violation");
const LicenseRenewalRequest = require("../models/LicenseRenewalRequest");
const AppError = require("../utils/AppError");
const generateCaseId = require("../utils/generateCaseId");
const { normalizeLicense } = require("../utils/qr");
const {
  emitNotificationToUser,
  emitNotificationUpdatedToUser,
  emitNotificationsReadAllToUser,
} = require("./realtime.service");

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_FINE_AMOUNT = 5000;
const DEFAULT_PAYMENT_DAYS = 15;
const MONTHLY_LATE_RENEWAL_FINE = 500;

const toDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toISOString().slice(0, 10);
};

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (dateValue, days) => {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
};

const getMonthKey = (value = new Date()) => {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const isDatePast = (value, now = new Date()) => {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date(now);

  if (Number.isNaN(date.getTime())) return false;

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date < today;
};

const getDaysUntilExpiry = (expiryDate, now = new Date()) => {
  const expiry = startOfDay(expiryDate);
  const today = startOfDay(now);

  return Math.ceil((expiry.getTime() - today.getTime()) / DAY_MS);
};

const getOfficialStatus = (brtaLicense = {}, daysUntilExpiry) => {
  const brtaStatus = String(brtaLicense.status || "valid").toLowerCase();

  if (["suspended", "blacklisted"].includes(brtaStatus)) {
    return brtaStatus;
  }

  if (brtaStatus === "expired" || daysUntilExpiry < 0) {
    return "expired";
  }

  return brtaStatus || "valid";
};

const getDriverName = ({ appLicense = {}, brtaLicense = {} }) => {
  return (
    appLicense.holderName ||
    appLicense.name ||
    brtaLicense.holderName ||
    "Driver"
  );
};

const createNotificationOnce = async ({
  recipient,
  type,
  title,
  message,
  severity = "info",
  link = "",
  metadata = {},
  dedupeKey,
}) => {
  if (!recipient || !dedupeKey) {
    return null;
  }

  const existingNotification = await Notification.findOne({ dedupeKey }).lean();

  if (existingNotification) {
    return existingNotification;
  }

  try {
    const notification = await Notification.create({
      recipient,
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
    if (error?.code === 11000) {
      return Notification.findOne({ dedupeKey }).lean();
    }

    throw error;
  }
};

const getSystemReviewer = async () => {
  const admin =
    (await User.findOne({ role: "admin", status: "active" }).lean()) ||
    (await User.findOne({ role: "admin" }).lean());

  if (!admin) {
    throw new AppError(
      "No admin account found for system auto-approved e-challan review.",
      500
    );
  }

  return admin;
};

const syncAppLicenseFromBrta = async ({
  appLicense,
  brtaLicense,
  officialStatus,
}) => {
  const updatePayload = {
    holderName: brtaLicense.holderName || appLicense.holderName,
    nid: brtaLicense.nid || appLicense.nid,
    bloodGroup: brtaLicense.bloodGroup || appLicense.bloodGroup,
    dateOfBirth: brtaLicense.dateOfBirth || appLicense.dateOfBirth,
    licenseClass: brtaLicense.licenseClass || appLicense.licenseClass,
    issueDate: brtaLicense.issueDate || appLicense.issueDate,
    expiryDate: brtaLicense.expiryDate || appLicense.expiryDate,
    issuingAuthority:
      brtaLicense.issuingAuthority || appLicense.issuingAuthority,
    qrCode: brtaLicense.qrCode || appLicense.qrCode,
    status: officialStatus,
  };

  await DrivingLicense.findByIdAndUpdate(appLicense._id, {
    $set: updatePayload,
  });

  return {
    ...appLicense,
    ...updatePayload,
  };
};

const createExpiredLicenseViolationOnce = async ({
  appLicense,
  brtaLicense,
  systemReviewer,
  now,
}) => {
  const expiryKey = toDateOnly(brtaLicense.expiryDate);
  const normalizedLicenseNumber = normalizeLicense(appLicense.licenseNumber);
  const automationKey = `DL_EXP:${appLicense._id}:${expiryKey}`;

  const existing = await Violation.findOne({ automationKey }).lean();

  if (existing) {
    return {
      created: false,
      violation: existing,
    };
  }

  const caseId = await generateCaseId();
  const dueDate = addDays(now, DEFAULT_PAYMENT_DAYS);

  const violation = await Violation.create({
    caseId,

    driver: appLicense.driver,
    license: appLicense._id,
    licenseNumber: normalizedLicenseNumber,

    officer: systemReviewer._id,
    adminReviewedBy: systemReviewer._id,

    violationType: "Expired Driving License",
    violationCode: "DL_EXP",
    description:
      "System-generated e-challan because the official BRTA driving license record is expired.",

    fineAmount: DEFAULT_FINE_AMOUNT,
    currency: "BDT",

    location: {
      address: "STVES Automated Enforcement",
      city: "System",
      district: "System",
    },

    evidence: [
      {
        type: "note",
        description: `Official BRTA license ${normalizedLicenseNumber} expired on ${expiryKey}. Auto-generated under rule DL_EXP.`,
      },
    ],

    status: "approved",
    paymentStatus: "unpaid",

    source: "system",
    reviewMode: "system",
    reviewRequired: false,
    ruleCode: "DL_EXP",
    confidenceScore: 100,
    dueDate,
    automationKey,
    autoGenerated: true,

    adminReviewNote:
      "Auto-approved by STVES rule engine: official BRTA expired driving license rule.",
    reviewNote:
      "Auto-approved by STVES rule engine: official BRTA expired driving license rule.",
    reviewedAt: now,
    adminReviewedAt: now,
    issuedAt: now,

    safetySnapshot: {
      driverScore: 30,
      riskLevel: "High Risk",
      issues: [
        {
          code: "DL_EXP",
          message: "Official BRTA driving license record is expired.",
          severity: "high",
          penalty: 30,
        },
      ],
    },
  });

  await createNotificationOnce({
    recipient: appLicense.driver,
    type: "auto_violation_created",
    title: "Expired license e-challan created",
    message: `Your driving license ${normalizedLicenseNumber} is expired in the official BRTA record. A system-approved e-challan ${caseId} has been created. Pay the fine and renew your license before ${toDateOnly(dueDate)}.`,
    severity: "critical",
    link: "my-violations",
    metadata: {
      license: appLicense._id,
      violation: violation._id,
      licenseNumber: normalizedLicenseNumber,
      ruleCode: "DL_EXP",
      dueDate,
    },
    dedupeKey: `NOTIFY:${automationKey}`,
  });

  return {
    created: true,
    violation,
  };
};

const createMonthlyLateRenewalPenaltyOnce = async ({
  appLicense,
  brtaLicense,
  systemReviewer,
  now,
}) => {
  const normalizedLicenseNumber = normalizeLicense(appLicense.licenseNumber);
  const expiryKey = toDateOnly(brtaLicense.expiryDate);
  const currentMonthKey = getMonthKey(now);

  const originalExpiredCase = await Violation.findOne({
    license: appLicense._id,
    ruleCode: "DL_EXP",
    status: {
      $ne: "dismissed",
    },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!originalExpiredCase || !isDatePast(originalExpiredCase.dueDate, now)) {
    return {
      created: false,
      reason: "main_due_date_not_crossed",
    };
  }

  const renewalRequest = await LicenseRenewalRequest.findOne({
    license: appLicense._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (renewalRequest?.status === "approved") {
    return {
      created: false,
      reason: "renewal_approved",
    };
  }

  if (["submitted", "under_review"].includes(renewalRequest?.status)) {
    return {
      created: false,
      paused: true,
      reason: "renewal_under_review",
    };
  }

  const automationKey = `DL_RENEW_LATE:${appLicense._id}:${currentMonthKey}`;

  const existing = await Violation.findOne({ automationKey }).lean();

  if (existing) {
    return {
      created: false,
      reason: "monthly_duplicate_prevented",
    };
  }

  const caseId = await generateCaseId();
  const dueDate = addDays(now, DEFAULT_PAYMENT_DAYS);

  const violation = await Violation.create({
    caseId,

    driver: appLicense.driver,
    license: appLicense._id,
    licenseNumber: normalizedLicenseNumber,

    officer: systemReviewer._id,
    adminReviewedBy: systemReviewer._id,

    violationType: "Late License Renewal Penalty",
    violationCode: "DL_RENEW_LATE",
    description:
      "System-generated monthly penalty because the expired driving license was not renewed after the allowed due date.",

    fineAmount: MONTHLY_LATE_RENEWAL_FINE,
    currency: "BDT",

    location: {
      address: "STVES Automated Enforcement",
      city: "System",
      district: "System",
    },

    evidence: [
      {
        type: "note",
        description: `License ${normalizedLicenseNumber} expired on ${expiryKey}. Main renewal due date crossed. Monthly late renewal penalty generated for ${currentMonthKey}.`,
      },
    ],

    status: "approved",
    paymentStatus: "unpaid",

    source: "system",
    reviewMode: "system",
    reviewRequired: false,
    ruleCode: "DL_RENEW_LATE",
    confidenceScore: 100,
    dueDate,
    automationKey,
    autoGenerated: true,

    adminReviewNote:
      "Auto-approved by STVES rule engine: monthly late license renewal penalty.",
    reviewNote:
      "Auto-approved by STVES rule engine: monthly late license renewal penalty.",
    reviewedAt: now,
    adminReviewedAt: now,
    issuedAt: now,

    safetySnapshot: {
      driverScore: 20,
      riskLevel: "Medium Risk",
      issues: [
        {
          code: "DL_RENEW_LATE",
          message: "Monthly late renewal penalty generated.",
          severity: "medium",
          penalty: 10,
        },
      ],
    },
  });

  await createNotificationOnce({
    recipient: appLicense.driver,
    type: "auto_violation_created",
    title: "Monthly late renewal penalty created",
    message: `Your license ${normalizedLicenseNumber} has not been renewed after the due date. A monthly late penalty ${caseId} of ৳${MONTHLY_LATE_RENEWAL_FINE} has been created.`,
    severity: "critical",
    link: "my-violations",
    metadata: {
      license: appLicense._id,
      violation: violation._id,
      licenseNumber: normalizedLicenseNumber,
      ruleCode: "DL_RENEW_LATE",
      dueDate,
    },
    dedupeKey: `NOTIFY:${automationKey}`,
  });

  return {
    created: true,
    violation,
  };
};

const processOfficialLicenseRule = async ({
  appLicense,
  brtaLicense,
  now,
  systemReviewer,
}) => {
  if (!appLicense.driver || !brtaLicense.expiryDate) {
    return {
      skipped: true,
      reason: "missing_driver_or_brta_expiry",
    };
  }

  const daysUntilExpiry = getDaysUntilExpiry(brtaLicense.expiryDate, now);
  const officialStatus = getOfficialStatus(brtaLicense, daysUntilExpiry);
  const syncedLicense = await syncAppLicenseFromBrta({
    appLicense,
    brtaLicense,
    officialStatus,
  });

  const expiryKey = toDateOnly(brtaLicense.expiryDate);
  const licenseNumber = normalizeLicense(appLicense.licenseNumber);
  const driverName = getDriverName({ appLicense, brtaLicense });

  if (["suspended", "blacklisted"].includes(officialStatus)) {
    return {
      noAction: true,
      reason: "official_status_not_expiry_rule",
    };
  }

  if (daysUntilExpiry <= 30 && daysUntilExpiry > 7) {
    await createNotificationOnce({
      recipient: syncedLicense.driver,
      type: "license_expiry_reminder",
      title: "Driving license renewal reminder",
      message: `${driverName}, your driving license ${licenseNumber} will expire within ${daysUntilExpiry} day(s) according to BRTA record. Please renew it before ${expiryKey}.`,
      severity: "warning",
      link: "my-license",
      metadata: {
        license: syncedLicense._id,
        licenseNumber,
        ruleCode: "DL_EXP_REMINDER_30",
        daysUntilExpiry,
      },
      dedupeKey: `DL_REMINDER_30:${syncedLicense._id}:${expiryKey}`,
    });

    return {
      reminder30: true,
    };
  }

  if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
    await createNotificationOnce({
      recipient: syncedLicense.driver,
      type: "license_expiry_reminder",
      title: "Driving license expires soon",
      message: `${driverName}, your driving license ${licenseNumber} expires in ${daysUntilExpiry} day(s) according to BRTA record. Renew immediately to avoid system e-challan.`,
      severity: "critical",
      link: "my-license",
      metadata: {
        license: syncedLicense._id,
        licenseNumber,
        ruleCode: "DL_EXP_REMINDER_7",
        daysUntilExpiry,
      },
      dedupeKey: `DL_REMINDER_7:${syncedLicense._id}:${expiryKey}`,
    });

    return {
      reminder7: true,
    };
  }

  if (officialStatus === "expired" || daysUntilExpiry < 0) {
    await createNotificationOnce({
      recipient: syncedLicense.driver,
      type: "license_expired",
      title: "Driving license expired",
      message: `${driverName}, your driving license ${licenseNumber} expired on ${expiryKey} according to BRTA record. A system e-challan will be generated automatically.`,
      severity: "critical",
      link: "my-license",
      metadata: {
        license: syncedLicense._id,
        licenseNumber,
        ruleCode: "DL_EXP",
        daysUntilExpiry,
      },
      dedupeKey: `DL_EXPIRED:${syncedLicense._id}:${expiryKey}`,
    });

    const result = await createExpiredLicenseViolationOnce({
      appLicense: syncedLicense,
      brtaLicense,
      systemReviewer,
      now,
    });

    const latePenaltyResult = await createMonthlyLateRenewalPenaltyOnce({
      appLicense: syncedLicense,
      brtaLicense,
      systemReviewer,
      now,
    });

    return {
      expired: true,
      violationCreated: result.created,
      latePenaltyCreated: latePenaltyResult.created,
      latePenaltyPaused: latePenaltyResult.paused,
    };
  }

  return {
    noAction: true,
  };
};

const runLicenseExpiryAutomation = async ({ now = new Date() } = {}) => {
  const systemReviewer = await getSystemReviewer();

  const summary = {
    scanned: 0,
    reminder30: 0,
    reminder7: 0,
    expired: 0,
    autoViolationsCreated: 0,
    latePenaltiesCreated: 0,
    latePenaltyPaused: 0,
    skipped: 0,
    noAction: 0,
    source: "BRTA_OFFICIAL",
  };

  const cursor = DrivingLicense.find({
    driver: {
      $exists: true,
      $ne: null,
    },
    status: {
      $nin: ["suspended", "blacklisted"],
    },
  })
    .lean()
    .cursor();

  for await (const appLicense of cursor) {
    summary.scanned += 1;

    const cleanLicense = normalizeLicense(appLicense.licenseNumber);

    if (!cleanLicense) {
      summary.skipped += 1;
      continue;
    }

    const brtaLicense = await BrtaDrivingLicense.findOne({
      licenseNumber: cleanLicense,
    }).lean();

    if (!brtaLicense) {
      summary.skipped += 1;
      continue;
    }

    const result = await processOfficialLicenseRule({
      appLicense,
      brtaLicense,
      now,
      systemReviewer,
    });

    if (result.reminder30) summary.reminder30 += 1;
    if (result.reminder7) summary.reminder7 += 1;
    if (result.expired) summary.expired += 1;
    if (result.violationCreated) summary.autoViolationsCreated += 1;
    if (result.latePenaltyCreated) summary.latePenaltiesCreated += 1;
    if (result.latePenaltyPaused) summary.latePenaltyPaused += 1;
    if (result.skipped) summary.skipped += 1;
    if (result.noAction) summary.noAction += 1;
  }

  return summary;
};

const getMyNotifications = async (user, { limit = 20 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return Notification.find({ recipient: user._id })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
};

const markNotificationRead = async (user, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: user._id,
    },
    {
      $set: {
        status: "read",
        readAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    }
  ).lean();

  if (notification) {
    emitNotificationUpdatedToUser(notification);
  }

  return notification;
};

const markAllNotificationsRead = async (user) => {
  const result = await Notification.updateMany(
    {
      recipient: user._id,
      status: "unread",
    },
    {
      $set: {
        status: "read",
        readAt: new Date(),
      },
    }
  );

  if ((result.modifiedCount || 0) > 0) {
    emitNotificationsReadAllToUser(user._id);
  }

  return {
    modifiedCount: result.modifiedCount || 0,
  };
};

module.exports = {
  runLicenseExpiryAutomation,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};