const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const generateToken = require("../utils/generateToken");
const { resolveBrtaAvatar } = require("./brtaAvatar.service");

const PUBLIC_REGISTER_ROLES = ["driver", "owner"];

const clean = (value = "") => String(value || "").trim();
const cleanUpper = (value = "") => clean(value).toUpperCase();

const sanitizeUser = (user) => {
  if (!user) return null;

  const obj = user.toObject ? user.toObject() : user;

  delete obj.password;

  return {
    id: obj._id,
    _id: obj._id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    status: obj.status,
    phone: obj.phone || "",
    nid: obj.nid || "",

    brtaDriverId: obj.brtaDriverId || "",
    brtaOwnerId: obj.brtaOwnerId || "",
    licenseNumber: obj.licenseNumber || "",
    avatarUrl: obj.avatarUrl || "",
    avatarPublicId: obj.avatarPublicId || "",
    avatarSource: obj.avatarSource || "default",

    badge: obj.badge || "",
    station: obj.station || "",
    rank: obj.rank || "",
    lastLogin: obj.lastLogin || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const registerUser = async (payload) => {
  const {
    name,
    email,
    password,
    role = "driver",
    phone,
    nid,
    brtaDriverId,
    brtaOwnerId,
    licenseNumber,
    badge,
    station,
    rank,
  } = payload;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required.", 400);
  }

  if (!PUBLIC_REGISTER_ROLES.includes(role)) {
    throw new AppError("Public registration is only allowed for driver or owner accounts.", 403);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("User already exists with this email.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const brtaAvatar = await resolveBrtaAvatar({
    role,
    nid,
    phone,
    brtaDriverId,
    brtaOwnerId,
    licenseNumber,
  });

  const userData = {
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    status: "active",
    avatarUrl: brtaAvatar.avatarUrl,
    avatarPublicId: brtaAvatar.avatarPublicId,
    avatarSource: brtaAvatar.avatarSource,
  };

  if (phone) userData.phone = clean(phone);
  if (nid) userData.nid = clean(nid);

  if (role === "driver") {
    if (brtaAvatar.brtaDriverId) userData.brtaDriverId = brtaAvatar.brtaDriverId;
    if (licenseNumber || brtaAvatar.licenseNumber) {
      userData.licenseNumber = cleanUpper(licenseNumber || brtaAvatar.licenseNumber);
    }
  }

  if (role === "owner") {
    if (brtaAvatar.brtaOwnerId) userData.brtaOwnerId = brtaAvatar.brtaOwnerId;
  }

  if (role === "police") {
    if (badge) userData.badge = clean(badge);
    if (station) userData.station = clean(station);
    if (rank) userData.rank = clean(rank);
  }

  const user = await User.create(userData);

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

const loginUser = async (payload) => {
  const { email, password } = payload;

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (user.status !== "active") {
    throw new AppError(`Account is ${user.status}. Please contact admin.`, 403);
  }

  const loginUpdate = {
    lastLogin: new Date(),
  };

  // Existing old users er avatarUrl empty hole login time BRTA photo sync hobe.
  if (["driver", "owner"].includes(user.role) && !user.avatarUrl) {
    const brtaAvatar = await resolveBrtaAvatar({
      role: user.role,
      nid: user.nid,
      phone: user.phone,
      brtaDriverId: user.brtaDriverId,
      brtaOwnerId: user.brtaOwnerId,
      licenseNumber: user.licenseNumber,
    });

    loginUpdate.avatarUrl = brtaAvatar.avatarUrl;
    loginUpdate.avatarPublicId = brtaAvatar.avatarPublicId;
    loginUpdate.avatarSource = brtaAvatar.avatarSource;

    if (user.role === "driver") {
      if (brtaAvatar.brtaDriverId) loginUpdate.brtaDriverId = brtaAvatar.brtaDriverId;
      if (brtaAvatar.licenseNumber) loginUpdate.licenseNumber = brtaAvatar.licenseNumber;
    }

    if (user.role === "owner" && brtaAvatar.brtaOwnerId) {
      loginUpdate.brtaOwnerId = brtaAvatar.brtaOwnerId;
    }
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: loginUpdate,
    }
  );

  const freshUser = await User.findById(user._id);
  const token = generateToken(freshUser);

  return {
    token,
    user: sanitizeUser(freshUser),
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};

module.exports = {
  sanitizeUser,
  registerUser,
  loginUser,
  getCurrentUser,
};