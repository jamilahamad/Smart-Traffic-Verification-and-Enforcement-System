const mongoose = require("mongoose");

const BrtaDriverVehicleAuthorizationSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      index: true,
    },

    licenseNumber: {
      type: String,
      required: true,
      index: true,
    },

    brtaDriverId: {
      type: String,
      index: true,
    },

    authorizationType: {
      type: String,
      enum: ["owner", "assigned_driver", "company_driver"],
      default: "assigned_driver",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "revoked"],
      default: "active",
      index: true,
    },

    startDate: Date,
    endDate: Date,
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.BrtaDriverVehicleAuthorization ||
  mongoose.model(
    "BrtaDriverVehicleAuthorization",
    BrtaDriverVehicleAuthorizationSchema,
    "brta_driver_vehicle_authorizations"
  );