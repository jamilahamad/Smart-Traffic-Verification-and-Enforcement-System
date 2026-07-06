const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AppError = require("../utils/AppError");

const STAFF_CREATE_ROLES = ["admin", "police"];
const STAFF_UPDATE_ROLES = ["admin", "police"];
const ALLOWED_STATUS = ["active", "inactive", "suspended", "blacklisted"];

const getId = (user = {}) => {
  if (!user) return "";
  return String(user._id || user.id || "");
};

const isSuperAdminUser = (user = {}) => {
  return user.role === "admin" && user.adminLevel === "super_admin";
};

const isSameUser = (firstUser = {}, secondUser = {}) => {
  const firstId = getId(firstUser);
  const secondId = getId(secondUser);

  return Boolean(firstId && secondId && firstId === secondId);
};

const getActorContext = async (actor = {}) => {
  if (!actor) return null;

  if (actor.adminLevel !== undefined || actor.isSuperAdmin !== undefined) {
    return actor;
  }

  const actorId = getId(actor);

  if (!actorId) return actor;

  return User.findById(actorId).lean();
};

const assertAdminActor = async (actor = {}) => {
  const actorContext = await getActorContext(actor);

  if (!actorContext || actorContext.role !== "admin") {
    throw new AppError("Only admin users can access user management.", 403);
  }

  return actorContext;
};

const canManageUser = (actor = {}, targetUser = {}) => {
  if (!actor || actor.role !== "admin") return false;

  if (isSameUser(actor, targetUser)) return false;

  if (isSuperAdminUser(targetUser)) return false;

  if (isSuperAdminUser(actor)) return true;

  return targetUser.role === "police";
};

const canViewUser = (actor = {}, targetUser = {}) => {
  if (!actor || actor.role !== "admin") return false;

  if (isSuperAdminUser(actor)) return true;

  return targetUser.role !== "admin";
};

const sanitizeUser = (user, actor = null) => {
  if (!user) return null;

  const obj = user.toObject ? user.toObject({ virtuals: true }) : user;
  const id = String(obj._id || obj.id || "");

  delete obj.password;

  const sanitized = {
    _id: obj._id,
    id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    adminLevel: obj.role === "admin" ? obj.adminLevel || "admin" : "",
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

    isSuperAdmin: isSuperAdminUser(obj),
    isProtected: isSuperAdminUser(obj),

    createdBy: obj.createdBy || null,
    updatedBy: obj.updatedBy || null,
    deletedAt: obj.deletedAt || null,
    deletedBy: obj.deletedBy || null,

    lastLogin: obj.lastLogin || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };

  sanitized.canBeManagedByCurrentUser = actor
    ? canManageUser(actor, sanitized)
    : false;

  return sanitized;
};

const buildUserQuery = (filters = {}, actor = {}) => {
  const query = {};

  if (filters.role) {
    const requestedRole = String(filters.role).trim().toLowerCase();

    if (!isSuperAdminUser(actor) && requestedRole === "admin") {
      return null;
    }

    query.role = requestedRole;
  } else if (!isSuperAdminUser(actor)) {
    query.role = { $ne: "admin" };
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

  return query;
};

const getUsers = async (filters = {}, actor = {}) => {
  const actorContext = await assertAdminActor(actor);
  const query = buildUserQuery(filters, actorContext);

  if (!query) return [];

  const users = await User.find(query).sort({ createdAt: -1 }).lean();

  return users
    .filter((user) => canViewUser(actorContext, user))
    .map((user) => sanitizeUser(user, actorContext));
};

const getUserById = async (id, actor = {}) => {
  const actorContext = await assertAdminActor(actor);
  const user = await User.findById(id).lean();

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (!canViewUser(actorContext, user)) {
    throw new AppError("You are not allowed to view this user.", 403);
  }

  return sanitizeUser(user, actorContext);
};

const createUser = async (payload, actor = {}) => {
  const actorContext = await assertAdminActor(actor);

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

  const cleanRole = String(role || "police").trim().toLowerCase();

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required.", 400);
  }

  if (!STAFF_CREATE_ROLES.includes(cleanRole)) {
    throw new AppError(
      "Only admin and police staff accounts can be created from Manage Users.",
      403
    );
  }

  if (cleanRole === "admin" && !isSuperAdminUser(actorContext)) {
    throw new AppError("Only Super Admin can create admin accounts.", 403);
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

  const cleanBadge = String(badge || "").trim();
  const cleanStation = String(station || "").trim();

  if (cleanRole === "police") {
    if (!cleanBadge) {
      throw new AppError("Police badge ID is required.", 400);
    }

    if (!cleanStation) {
      throw new AppError("Police station is required.", 400);
    }

    const badgeTaken = await User.findOne({ badge: cleanBadge });

    if (badgeTaken) {
      throw new AppError("Police badge ID is already used.", 409);
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userData = {
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: cleanRole,
    status,
    createdBy: actorContext._id || actorContext.id || null,
  };

  if (cleanRole === "admin") {
    userData.adminLevel = "admin";
  }

  if (phone) userData.phone = String(phone).trim();
  if (nid) userData.nid = String(nid).trim();
  if (address) userData.address = String(address).trim();

  if (cleanRole === "police") {
    userData.badge = cleanBadge;
    userData.station = cleanStation;
    if (rank) userData.rank = String(rank).trim();
  }

  const user = await User.create(userData);

  return sanitizeUser(user, actorContext);
};

const updateUser = async (id, payload, actor = {}) => {
  const actorContext = await assertAdminActor(actor);
  const existingUser = await User.findById(id);

  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  if (!canManageUser(actorContext, existingUser)) {
    throw new AppError("You are not allowed to manage this user.", 403);
  }

  const update = {
    updatedBy: actorContext._id || actorContext.id || null,
  };

  const unset = {};

  if (payload.name !== undefined) {
    update.name = String(payload.name).trim();
  }

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

  let finalRole = existingUser.role;

  if (payload.role !== undefined) {
    const requestedRole = String(payload.role).trim().toLowerCase();

    if (!STAFF_UPDATE_ROLES.includes(requestedRole)) {
      throw new AppError(
        "Only admin and police staff roles can be assigned from Manage Users.",
        403
      );
    }

    if (requestedRole === "admin" && !isSuperAdminUser(actorContext)) {
      throw new AppError("Only Super Admin can assign admin role.", 403);
    }

    if (["driver", "owner"].includes(existingUser.role)) {
      throw new AppError("Driver and owner roles cannot be changed from Manage Users.", 403);
    }

    finalRole = requestedRole;
    update.role = requestedRole;

    if (requestedRole === "admin") {
      update.adminLevel = "admin";
      unset.badge = "";
      unset.station = "";
      unset.rank = "";
    }

    if (requestedRole === "police") {
      unset.adminLevel = "";
    }
  }

  if (payload.status !== undefined) {
    if (!ALLOWED_STATUS.includes(payload.status)) {
      throw new AppError("Invalid status.", 400);
    }

    update.status = payload.status;
  }

  if (payload.phone !== undefined) {
    update.phone = String(payload.phone).trim();
  }

  if (payload.address !== undefined) {
    update.address = String(payload.address).trim();
  }

  if (payload.nid !== undefined) {
    const cleanNid = String(payload.nid || "").trim();

    if (cleanNid) {
      update.nid = cleanNid;
    } else {
      unset.nid = "";
    }
  }

  if (payload.badge !== undefined) {
    const cleanBadge = String(payload.badge || "").trim();

    if (cleanBadge) {
      const badgeTaken = await User.findOne({
        badge: cleanBadge,
        _id: { $ne: id },
      });

      if (badgeTaken) {
        throw new AppError("Police badge ID is already used.", 409);
      }

      update.badge = cleanBadge;
    } else {
      unset.badge = "";
    }
  }

  if (payload.station !== undefined) {
    update.station = String(payload.station || "").trim();
  }

  if (payload.rank !== undefined) {
    const cleanRank = String(payload.rank || "").trim();

    if (cleanRank) {
      update.rank = cleanRank;
    } else {
      unset.rank = "";
    }
  }

  if (payload.password) {
    if (String(payload.password).length < 6) {
      throw new AppError("Password must be at least 6 characters.", 400);
    }

    update.password = await bcrypt.hash(payload.password, 10);
  }

  const finalBadge =
    payload.badge !== undefined ? String(payload.badge || "").trim() : existingUser.badge || "";

  const finalStation =
    payload.station !== undefined
      ? String(payload.station || "").trim()
      : existingUser.station || "";

  if (finalRole === "police") {
    if (!finalBadge) {
      throw new AppError("Police badge ID is required.", 400);
    }

    if (!finalStation) {
      throw new AppError("Police station is required.", 400);
    }
  }

  const updateCommand = { ...update };

  if (Object.keys(unset).length > 0) {
    updateCommand.$unset = unset;
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateCommand, {
    returnDocument: "after",
    runValidators: true,
  }).lean();

  return sanitizeUser(updatedUser, actorContext);
};

const updateUserStatus = async (id, status, actor = {}) => {
  const actorContext = await assertAdminActor(actor);
  const existingUser = await User.findById(id);

  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  if (!canManageUser(actorContext, existingUser)) {
    throw new AppError("You are not allowed to update this user status.", 403);
  }

  if (!ALLOWED_STATUS.includes(status)) {
    throw new AppError("Invalid status.", 400);
  }

  existingUser.status = status;
  existingUser.updatedBy = actorContext._id || actorContext.id || null;

  await existingUser.save();

  return sanitizeUser(existingUser, actorContext);
};

const deleteUser = async (id, actor = {}) => {
  const actorContext = await assertAdminActor(actor);
  const existingUser = await User.findById(id);

  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  if (!canManageUser(actorContext, existingUser)) {
    throw new AppError("You are not allowed to deactivate this user.", 403);
  }

  existingUser.status = "inactive";
  existingUser.deletedAt = new Date();
  existingUser.deletedBy = actorContext._id || actorContext.id || null;
  existingUser.updatedBy = actorContext._id || actorContext.id || null;

  await existingUser.save();

  return sanitizeUser(existingUser, actorContext);
};

module.exports = {
  sanitizeUser,
  isSuperAdminUser,
  canManageUser,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
};