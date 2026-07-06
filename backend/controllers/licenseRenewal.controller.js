const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");

const DrivingLicense = require("../models/DrivingLicense");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const Notification = require("../models/Notification");
const LicenseRenewalRequest = require("../models/LicenseRenewalRequest");

const { normalizeLicense } = require("../utils/qr");
const { emitNotificationToUser } = require("../services/realtime.service");

const isFutureDate = (value) => {
  const date = new Date(value);
  const today = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date > today;
};

const getDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toISOString().slice(0, 10);
};

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  severity = "info",
  link = "",
  metadata = {},
  dedupeKey,
}) => {
  if (!recipient) return null;

  const payload = {
    recipient,
    type,
    title,
    message,
    severity,
    link,
    metadata,
    dedupeKey,
  };

  if (dedupeKey) {
    const existingNotification = await Notification.findOne({ dedupeKey }).lean();

    if (existingNotification) {
      return existingNotification;
    }

    try {
      const notification = await Notification.create(payload);
      emitNotificationToUser(notification);
      return notification;
    } catch (error) {
      if (error?.code === 11000) {
        return Notification.findOne({ dedupeKey }).lean();
      }

      throw error;
    }
  }

  const notification = await Notification.create(payload);
  emitNotificationToUser(notification);

  return notification;
};

const submitRenewalProof = asyncHandler(async (req, res) => {
  const {
    licenseId,
    licenseNumber,
    proofType,
    proofReference,
    proofNote,
    requestedExpiryDate,
  } = req.body || {};

  const cleanLicenseNumber = normalizeLicense(licenseNumber);

  if (!licenseId && !cleanLicenseNumber) {
    throw new AppError("License ID or license number is required.", 400);
  }

  if (!proofReference || !String(proofReference).trim()) {
    throw new AppError("Renewal proof reference is required.", 400);
  }

  const licenseQuery = {
    driver: req.user._id,
  };

  if (licenseId) {
    licenseQuery._id = licenseId;
  } else {
    licenseQuery.licenseNumber = cleanLicenseNumber;
  }

  const appLicense = await DrivingLicense.findOne(licenseQuery).lean();

  if (!appLicense) {
    throw new AppError("License record was not found for this driver.", 404);
  }

  const normalizedLicenseNumber = normalizeLicense(appLicense.licenseNumber);

  const activeRequest = await LicenseRenewalRequest.findOne({
    driver: req.user._id,
    license: appLicense._id,
    status: {
      $in: ["submitted", "under_review"],
    },
  }).lean();

  if (activeRequest) {
    return sendSuccess(res, 200, "Renewal proof already submitted.", {
      request: activeRequest,
    });
  }

  const renewalRequest = await LicenseRenewalRequest.create({
    driver: req.user._id,
    license: appLicense._id,
    licenseNumber: normalizedLicenseNumber,
    proofType: proofType || "brta_receipt",
    proofReference: String(proofReference).trim(),
    proofNote: proofNote || "",
    requestedExpiryDate: requestedExpiryDate || undefined,
    previousExpiryDate: appLicense.expiryDate,
    status: "submitted",
  });

  await createNotification({
    recipient: req.user._id,
    type: "system",
    title: "Renewal proof submitted",
    message: `Your renewal proof for license ${normalizedLicenseNumber} has been submitted and is waiting for review.`,
    severity: "success",
    link: "my-license",
    metadata: {
      license: appLicense._id,
      licenseNumber: normalizedLicenseNumber,
      renewalRequest: renewalRequest._id,
    },
    dedupeKey: `RENEWAL_SUBMITTED:${renewalRequest._id}`,
  });

  return sendSuccess(res, 201, "Renewal proof submitted successfully.", {
    request: renewalRequest,
  });
});

const getMyRenewalRequests = asyncHandler(async (req, res) => {
  const requests = await LicenseRenewalRequest.find({
    driver: req.user._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 200, "My renewal requests fetched successfully.", {
    count: requests.length,
    requests,
  });
});

const getPendingRenewalRequests = asyncHandler(async (req, res) => {
  const requests = await LicenseRenewalRequest.find({
    status: {
      $in: ["submitted", "under_review"],
    },
  })
    .populate("driver", "name email phone nid role status")
    .populate("license", "licenseNumber holderName expiryDate status")
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 200, "Pending renewal requests fetched successfully.", {
    count: requests.length,
    requests,
  });
});

const reviewRenewalRequest = asyncHandler(async (req, res) => {
  const { status, reviewNote, approvedExpiryDate } = req.body || {};
  const nextStatus = String(status || "").toLowerCase();

  if (!["under_review", "approved", "rejected"].includes(nextStatus)) {
    throw new AppError("Review status must be under_review, approved or rejected.", 400);
  }

  const renewalRequest = await LicenseRenewalRequest.findById(req.params.id);

  if (!renewalRequest) {
    throw new AppError("Renewal request was not found.", 404);
  }

  if (["approved", "rejected"].includes(renewalRequest.status)) {
    throw new AppError("This renewal request has already been reviewed.", 400);
  }

  const normalizedLicenseNumber = normalizeLicense(renewalRequest.licenseNumber);

  if (nextStatus === "under_review") {
    if (renewalRequest.status === "under_review") {
      throw new AppError("This renewal request is already under review.", 400);
    }

    renewalRequest.status = "under_review";
    renewalRequest.reviewedBy = req.user._id;
    renewalRequest.reviewedAt = new Date();
    renewalRequest.reviewNote = reviewNote || "Renewal proof is under admin review.";

    await renewalRequest.save();

    await createNotification({
      recipient: renewalRequest.driver,
      type: "system",
      title: "Renewal proof under review",
      message: `Your renewal proof for license ${normalizedLicenseNumber} is now under admin review.`,
      severity: "info",
      link: "my-license",
      metadata: {
        license: renewalRequest.license,
        licenseNumber: normalizedLicenseNumber,
        renewalRequest: renewalRequest._id,
      },
      dedupeKey: `RENEWAL_UNDER_REVIEW:${renewalRequest._id}`,
    });

    return sendSuccess(res, 200, "Renewal request marked as under review.", {
      request: renewalRequest,
    });
  }

  if (nextStatus === "approved") {
    const finalExpiryDate = approvedExpiryDate || renewalRequest.requestedExpiryDate;

    if (!finalExpiryDate || !isFutureDate(finalExpiryDate)) {
      throw new AppError("A valid future approved expiry date is required.", 400);
    }

    renewalRequest.status = "approved";
    renewalRequest.reviewedBy = req.user._id;
    renewalRequest.reviewedAt = new Date();
    renewalRequest.reviewNote = reviewNote || "Renewal proof approved.";
    renewalRequest.approvedExpiryDate = finalExpiryDate;

    await renewalRequest.save();

    await Promise.all([
      DrivingLicense.findByIdAndUpdate(renewalRequest.license, {
        $set: {
          expiryDate: finalExpiryDate,
          status: "valid",
        },
      }),

      BrtaDrivingLicense.findOneAndUpdate(
        {
          licenseNumber: normalizedLicenseNumber,
        },
        {
          $set: {
            expiryDate: finalExpiryDate,
            status: "valid",
          },
        },
        {
          returnDocument: "after",
        }
      ),
    ]);

    await createNotification({
      recipient: renewalRequest.driver,
      type: "system",
      title: "License renewal approved",
      message: `Your license ${normalizedLicenseNumber} renewal has been approved. New expiry date: ${getDateOnly(finalExpiryDate)}.`,
      severity: "success",
      link: "my-license",
      metadata: {
        license: renewalRequest.license,
        licenseNumber: normalizedLicenseNumber,
        renewalRequest: renewalRequest._id,
      },
      dedupeKey: `RENEWAL_APPROVED:${renewalRequest._id}`,
    });

    return sendSuccess(res, 200, "Renewal request approved successfully.", {
      request: renewalRequest,
    });
  }

  renewalRequest.status = "rejected";
  renewalRequest.reviewedBy = req.user._id;
  renewalRequest.reviewedAt = new Date();
  renewalRequest.reviewNote = reviewNote || "Renewal proof rejected.";

  await renewalRequest.save();

  await createNotification({
    recipient: renewalRequest.driver,
    type: "system",
    title: "License renewal rejected",
    message: `Your license ${normalizedLicenseNumber} renewal proof was rejected. Please submit valid proof again.`,
    severity: "critical",
    link: "my-license",
    metadata: {
      license: renewalRequest.license,
      licenseNumber: normalizedLicenseNumber,
      renewalRequest: renewalRequest._id,
    },
    dedupeKey: `RENEWAL_REJECTED:${renewalRequest._id}`,
  });

  return sendSuccess(res, 200, "Renewal request rejected successfully.", {
    request: renewalRequest,
  });
});

module.exports = {
  submitRenewalProof,
  getMyRenewalRequests,
  getPendingRenewalRequests,
  reviewRenewalRequest,
};