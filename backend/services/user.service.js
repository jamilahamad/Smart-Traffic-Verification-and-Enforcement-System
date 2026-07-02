const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AppError = require("../utils/AppError");

const STAFF_CREATE_ROLES = ["police"];
const STAFF_UPDATE_ROLES = ["police"];
const ALLOWED_STATUS = ["active", "inactive", "suspended", "blacklisted"];

const sanitizeUser = (user) => {
  if (!user) return null;

  const obj = user.toObject ? user.toObject() : user;

  delete obj.password;

  return {
    _id: obj._id,
    id: obj._id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    status: obj.status,
    phone: obj.phone || "",
    nid: obj.nid || "",
    address: obj.address || "",

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

const getUsers = async (filters = {}) => {
  const query = {};

  if (filters.role) {
    query.role = filters.role;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.search) {
    const search = String(filters.search).trim();

    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { nid: { $regex: search, $options: "i" } },
      { badge: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query).sort({ createdAt: -1 }).lean();

  return users.map(sanitizeUser);
};

const getUserById = async (id) => {
  const user = await User.findById(id).lean();

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};

const createUser = async (payload) => {
  const {
    name,
    email,
    password,
    role = "police",
    status = "active",
    phone,
    nid,
    address,
    badge,
    station,
    rank,
  } = payload;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required.", 400);
  }

  if (!STAFF_CREATE_ROLES.includes(role)) {
    throw new AppError("Admin can only create police staff accounts from Manage Users.", 403);
  }

  if (!ALLOWED_STATUS.includes(status)) {
    throw new AppError("Invalid status.", 400);
  }

  if (String(password).length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("User already exists with this email.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userData = {
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    status,
  };

  if (phone) userData.phone = String(phone).trim();
  if (nid) userData.nid = String(nid).trim();
  if (address) userData.address = String(address).trim();

  if (role === "police") {
    if (badge) userData.badge = String(badge).trim();
    if (station) userData.station = String(station).trim();
    if (rank) userData.rank = String(rank).trim();
  }

  const user = await User.create(userData);

  return sanitizeUser(user);
};

const updateUser = async (id, payload) => {
  const existingUser = await User.findById(id);

  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  const update = {};

  if (payload.name !== undefined) update.name = String(payload.name).trim();

  if (payload.email !== undefined) {
    const normalizedEmail = String(payload.email).trim().toLowerCase();

    const emailTaken = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: id },
    });

    if (emailTaken) {
      throw new AppError("Email is already used by another user.", 409);
    }

    update.email = normalizedEmail;
  }

  if (payload.role !== undefined) {
    if (!STAFF_UPDATE_ROLES.includes(payload.role)) {
      throw new AppError("Admin can only assign the police staff role from Manage Users.", 403);
    }

    update.role = payload.role;
  }

  if (payload.status !== undefined) {
    if (!ALLOWED_STATUS.includes(payload.status)) {
      throw new AppError("Invalid status.", 400);
    }

    update.status = payload.status;
  }

  if (payload.phone !== undefined) update.phone = String(payload.phone).trim();
  if (payload.address !== undefined) update.address = String(payload.address).trim();
  if (payload.nid !== undefined) {
    const cleanNid = String(payload.nid || "").trim();

    if (cleanNid) {
      update.nid = cleanNid;
    } else {
      update.$unset = { ...(update.$unset || {}), nid: "" };
    }
  }

  if (payload.badge !== undefined) {
    if (payload.badge) update.badge = String(payload.badge).trim();
    else update.$unset = { ...(update.$unset || {}), badge: "" };
  }

  if (payload.station !== undefined) update.station = String(payload.station).trim();
  if (payload.rank !== undefined) update.rank = String(payload.rank).trim();

  if (payload.password) {
    if (String(payload.password).length < 6) {
      throw new AppError("Password must be at least 6 characters.", 400);
    }

    update.password = await bcrypt.hash(payload.password, 10);
  }

  const updatedUser = await User.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean();

  return sanitizeUser(updatedUser);
};

module.exports = {
  sanitizeUser,
  getUsers,
  getUserById,
  createUser,
  updateUser,
};