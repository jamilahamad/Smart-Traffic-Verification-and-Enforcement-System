const mongoose = require("mongoose");

const BrtaDriverSchema = new mongoose.Schema(
  {
    brtaDriverId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: String,

    nid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    phone: String,
    bloodGroup: String,
    dateOfBirth: Date,

    photoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    photoPublicId: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      line: String,
      city: String,
      district: String,
      division: String,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "blacklisted"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.BrtaDriver ||
  mongoose.model("BrtaDriver", BrtaDriverSchema, "brta_drivers");