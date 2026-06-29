const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    vehicleType: {
      type: String,
      enum: [
        "car",
        "bus",
        "truck",
        "motorcycle",
        "bike",
        "cng",
        "microbus",
        "other",
      ],
      required: true,
    },

    brand: {
      type: String,
      trim: true,
    },

    model: {
      type: String,
      trim: true,
    },

    year: Number,

    color: {
      type: String,
      trim: true,
    },

    chassisNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    engineNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    registrationDate: Date,
    registrationExpiry: Date,
    fitnessExpiry: Date,
    taxTokenExpiry: Date,
    insuranceExpiry: Date,
    routePermitExpiry: Date,

    qrCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "expired", "suspended", "blacklisted", "pending"],
      default: "active",
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
  mongoose.models.Vehicle ||
  mongoose.model("Vehicle", vehicleSchema, "vehicles");