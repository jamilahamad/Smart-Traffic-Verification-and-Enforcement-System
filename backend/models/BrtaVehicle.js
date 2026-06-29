const mongoose = require("mongoose");

const BrtaVehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    qrCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    brtaOwnerId: {
      type: String,
      index: true,
    },

    vehicleType: String,
    brand: String,
    model: String,
    year: Number,
    color: String,

    chassisNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    engineNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    registrationDate: Date,
    registrationExpiry: Date,

    status: {
      type: String,
      enum: ["active", "expired", "suspended", "blacklisted"],
      default: "active",
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
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.BrtaVehicle ||
  mongoose.model("BrtaVehicle", BrtaVehicleSchema, "brta_vehicles");