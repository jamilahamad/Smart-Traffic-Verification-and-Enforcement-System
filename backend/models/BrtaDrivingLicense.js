const mongoose = require("mongoose");

const BrtaDrivingLicenseSchema = new mongoose.Schema(
  {
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    qrCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    brtaDriverId: {
      type: String,
      index: true,
    },

    holderName: String,

    nid: {
      type: String,
      index: true,
    },

    bloodGroup: String,
    dateOfBirth: Date,

    licenseClass: {
      type: String,
      index: true,
    },

    issueDate: Date,
    expiryDate: Date,
    issuingAuthority: String,

    status: {
      type: String,
      enum: ["valid", "active", "expired", "suspended", "blacklisted", "pending"],
      default: "valid",
      index: true,
    },

    brtaSource: {
      type: String,
      default: "BRTA_MOCK",
    },

    brtaProvider: {
      type: String,
      default: "Mock BRTA Registry",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.BrtaDrivingLicense ||
  mongoose.model(
    "BrtaDrivingLicense",
    BrtaDrivingLicenseSchema,
    "brta_driving_licenses"
  );