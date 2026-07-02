const mongoose = require("mongoose");

const BrtaOwnerSchema = new mongoose.Schema(
  {
    brtaOwnerId: {
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
      enum: ["active", "inactive", "blacklisted"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.BrtaOwner ||
  mongoose.model("BrtaOwner", BrtaOwnerSchema, "brta_owners");