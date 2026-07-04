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

    adminLevel: {
      type: String,
      enum: ["admin", "super_admin"],
      default: undefined,
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

UserSchema.virtual("isSuperAdmin").get(function () {
  return this.role === "admin" && this.adminLevel === "super_admin";
});

UserSchema.virtual("isProtected").get(function () {
  return this.isSuperAdmin === true;
});

UserSchema.pre("save", function () {
  if (this.role !== "admin") {
    this.adminLevel = undefined;
  }

  if (this.role === "admin" && !this.adminLevel) {
    this.adminLevel = "admin";
  }
});

UserSchema.index({ role: 1, adminLevel: 1, status: 1 });
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ brtaDriverId: 1, role: 1 });
UserSchema.index({ brtaOwnerId: 1, role: 1 });
UserSchema.index({ licenseNumber: 1, role: 1 });

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema, "users");