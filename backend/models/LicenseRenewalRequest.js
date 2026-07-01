const mongoose = require("mongoose");

const licenseRenewalRequestSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrivingLicense",
      required: true,
      index: true,
    },

    licenseNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    proofType: {
      type: String,
      enum: ["brta_receipt", "renewal_application", "digital_slip", "other"],
      default: "brta_receipt",
    },

    proofReference: {
      type: String,
      required: true,
      trim: true,
    },

    proofNote: {
      type: String,
      trim: true,
    },

    requestedExpiryDate: {
      type: Date,
    },

    previousExpiryDate: {
      type: Date,
    },

    approvedExpiryDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "rejected"],
      default: "submitted",
      index: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    reviewNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

licenseRenewalRequestSchema.index(
  {
    license: 1,
    status: 1,
  },
  {
    name: "license_renewal_active_request_idx",
  }
);

module.exports =
  mongoose.models.LicenseRenewalRequest ||
  mongoose.model(
    "LicenseRenewalRequest",
    licenseRenewalRequestSchema,
    "license_renewal_requests"
  );