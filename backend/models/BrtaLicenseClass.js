const mongoose = require("mongoose");

const BrtaLicenseClassSchema = new mongoose.Schema(
  {
    classCode: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    className: String,

    allowedVehicleTypes: [String],

    minimumAge: Number,

    description: String,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.BrtaLicenseClass ||
  mongoose.model("BrtaLicenseClass", BrtaLicenseClassSchema, "brta_license_classes");