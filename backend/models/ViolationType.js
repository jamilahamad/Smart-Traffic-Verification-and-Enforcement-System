const mongoose = require("mongoose");

const APPLICABLE_USER_TYPES = ["driver", "owner"];
const SEVERITY_LEVELS = ["low", "medium", "high", "critical"];
const STATUS_VALUES = ["active", "inactive"];

const violationTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    fineAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    severity: {
      type: String,
      enum: SEVERITY_LEVELS,
      default: "medium",
      index: true,
    },

    points: {
      type: Number,
      min: 0,
      default: 0,
    },

    applicableTo: {
      type: [
        {
          type: String,
          enum: APPLICABLE_USER_TYPES,
        },
      ],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one applicable user type is required.",
      },
      index: true,
    },

    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "active",
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

violationTypeSchema.index({ name: 1, isDeleted: 1 });
violationTypeSchema.index({ status: 1, isDeleted: 1 });
violationTypeSchema.index({ severity: 1, status: 1, isDeleted: 1 });

module.exports =
  mongoose.models.ViolationType ||
  mongoose.model("ViolationType", violationTypeSchema, "violationtypes");