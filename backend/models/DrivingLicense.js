const mongoose = require("mongoose");

const drivingLicenseSchema = new mongoose.Schema(
  {
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    holderName: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      trim: true,
    },

    nid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    bloodGroup: {
      type: String,
      trim: true,
    },

    dateOfBirth: Date,

    address: {
      line: String,
      city: String,
      district: String,
      division: String,
      postalCode: String,
    },

    licenseClass: {
      type: String,
      enum: ["motorcycle", "light", "medium", "heavy", "professional"],
      required: true,
      index: true,
    },

    licenseType: {
      type: String,
      trim: true,
    },

    issueDate: Date,
    expiryDate: {
      type: Date,
      index: true,
    },

    issuingAuthority: {
      type: String,
      default: "BRTA",
      trim: true,
    },

    qrCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["valid", "active", "expired", "suspended", "blacklisted", "pending"],
      default: "valid",
      index: true,
    },

    safetyScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    complianceScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    riskLevel: {
      type: String,
      enum: ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"],
      default: "Low Risk",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DrivingLicense ||
  mongoose.model("DrivingLicense", drivingLicenseSchema, "drivinglicenses");