const mongoose = require("mongoose");

const BrtaBlacklistRecordSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["vehicle", "license", "driver", "owner"],
      required: true,
      index: true,
    },

    registrationNumber: {
      type: String,
      index: true,
    },

    licenseNumber: {
      type: String,
      index: true,
    },

    brtaDriverId: {
      type: String,
      index: true,
    },

    brtaOwnerId: {
      type: String,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
      index: true,
    },

    reason: String,
    severity: String,
    issuedBy: String,
    issuedAt: Date,

    removedAt: Date,
    removalReason: String,
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.BrtaBlacklistRecord ||
  mongoose.model(
    "BrtaBlacklistRecord",
    BrtaBlacklistRecordSchema,
    "brta_blacklist_records"
  );