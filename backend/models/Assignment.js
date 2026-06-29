const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    registrationNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrivingLicense",
    },

    licenseNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: [
        "pending_driver_approval",
        "invitation_pending",
        "active",
        "inactive",
        "rejected",
        "cancelled",
        "removed",
      ],
      default: "pending_driver_approval",
    },

    driverSource: {
      type: String,
      enum: ["STVES_ACCOUNT", "BRTA_ONLY"],
      default: "STVES_ACCOUNT",
    },

    brtaDriverId: {
      type: String,
      trim: true,
    },

    invitationContact: {
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: Date,

    approvedByDriverAt: Date,

    rejectedByDriverAt: Date,

    requestNote: {
      type: String,
      trim: true,
    },

    driverResponseNote: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    removeInfo: {
      removedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      removedAt: Date,
      reason: {
        type: String,
        trim: true,
      },
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ vehicle: 1 });
assignmentSchema.index({ driver: 1 });
assignmentSchema.index({ license: 1 });
assignmentSchema.index({ owner: 1 });
assignmentSchema.index({ assignedBy: 1 });
assignmentSchema.index({ requestedBy: 1 });
assignmentSchema.index({ registrationNumber: 1 });
assignmentSchema.index({ licenseNumber: 1 });
assignmentSchema.index({ brtaDriverId: 1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ driverSource: 1 });
assignmentSchema.index({ createdAt: -1 });

assignmentSchema.index({ owner: 1, status: 1 });
assignmentSchema.index({ driver: 1, status: 1 });
assignmentSchema.index({ vehicle: 1, driver: 1, status: 1 });
assignmentSchema.index({ registrationNumber: 1, licenseNumber: 1, status: 1 });

module.exports =
  mongoose.models.Assignment ||
  mongoose.model("Assignment", assignmentSchema, "assignments");