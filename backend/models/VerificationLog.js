const mongoose = require("mongoose");

const verificationLogSchema = new mongoose.Schema(
  {
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    searchType: {
      type: String,
      enum: ["vehicle", "license", "qr", "plate", "driver"],
      index: true,
    },

    type: {
      type: String,
      index: true,
    },

    searchValue: {
      type: String,
      trim: true,
      index: true,
    },

    query: {
      type: String,
      trim: true,
      index: true,
    },

    registrationNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },

    licenseNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrivingLicense",
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    dataSource: {
      type: String,
      default: "BRTA_MOCK",
    },

    brtaProvider: {
      type: String,
      default: "Mock BRTA Registry",
    },

    result: {
      type: String,
      enum: ["valid", "invalid", "warning", "not_found", "error"],
      default: "valid",
      index: true,
    },

    isCompliant: Boolean,

    safetyScore: Number,
    complianceScore: Number,
    riskLevel: String,

    verification: {
      result: String,
      isCompliant: Boolean,
      safetyScore: Number,
      complianceScore: Number,
      riskLevel: String,
    },

    issues: [
      {
        code: String,
        message: String,
        severity: String,
        penalty: Number,
      },
    ],

    location: {
      address: String,
      city: String,
      district: String,
      lat: Number,
      lng: Number,
    },

    deviceInfo: {
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.VerificationLog ||
  mongoose.model("VerificationLog", verificationLogSchema, "verificationlogs");