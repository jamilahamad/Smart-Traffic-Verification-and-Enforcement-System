const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    actorRole: String,

    action: {
      type: String,
      required: true,
      index: true,
    },

    module: {
      type: String,
      enum: [
        "auth",
        "user",
        "vehicle",
        "license",
        "violation",
        "assignment",
        "payment",
        "analytics",
        "system",
      ],
      default: "system",
      index: true,
    },

    entityType: String,

    entityId: mongoose.Schema.Types.ObjectId,

    before: Object,
    after: Object,

    message: String,

    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema, "auditlogs");