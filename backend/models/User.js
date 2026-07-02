const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "police", "driver", "owner"],
      default: "driver",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "blacklisted"],
      default: "active",
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    nid: {
      type: String,
      trim: true,
      sparse: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    brtaDriverId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    brtaOwnerId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      sparse: true,
    },

    avatarUrl: {
      type: String,
      trim: true,
      default: "",
    },

    avatarPublicId: {
      type: String,
      trim: true,
      default: "",
    },

    avatarSource: {
      type: String,
      enum: ["default", "brta", "manual"],
      default: "default",
    },

    badge: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    station: {
      type: String,
      trim: true,
    },

    rank: {
      type: String,
      trim: true,
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema, "users");