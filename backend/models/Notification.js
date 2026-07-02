const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "license_expiry_reminder",
        "license_expired",
        "auto_violation_created",
        "system",
      ],
      default: "system",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    severity: {
      type: String,
      enum: ["info", "warning", "critical", "success"],
      default: "info",
      index: true,
    },

    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },

    link: {
      type: String,
      trim: true,
    },

    metadata: {
      license: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DrivingLicense",
      },
      violation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Violation",
      },
      licenseNumber: String,
      ruleCode: String,
      dueDate: Date,
      daysUntilExpiry: Number,
    },

    dedupeKey: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    readAt: Date,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema, "notifications");