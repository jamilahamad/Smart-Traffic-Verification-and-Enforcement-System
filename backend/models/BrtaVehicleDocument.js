const mongoose = require("mongoose");

const BrtaVehicleDocumentSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    registrationCertificate: {
      certificateNo: String,
      issueDate: Date,
      expiryDate: Date,
      status: String,
    },

    fitnessCertificate: {
      certificateNo: String,
      issueDate: Date,
      expiryDate: Date,
      status: String,
    },

    taxToken: {
      tokenNo: String,
      issueDate: Date,
      expiryDate: Date,
      status: String,
    },

    insurance: {
      policyNo: String,
      provider: String,
      issueDate: Date,
      expiryDate: Date,
      status: String,
    },

    routePermit: {
      permitNo: String,
      route: String,
      issueDate: Date,
      expiryDate: Date,
      status: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.BrtaVehicleDocument ||
  mongoose.model(
    "BrtaVehicleDocument",
    BrtaVehicleDocumentSchema,
    "brta_vehicle_documents"
  );