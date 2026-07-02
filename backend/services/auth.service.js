const bcrypt = require("bcryptjs");

const User = require("../models/User");
const BrtaDriver = require("../models/BrtaDriver");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaOwner = require("../models/BrtaOwner");
const AppError = require("../utils/AppError");
const generateToken = require("../utils/generateToken");
const { resolveBrtaAvatar } = require("./brtaAvatar.service");

const PUBLIC_REGISTER_ROLES = ["driver", "owner"];
const BLOCKED_BRTA_STATUSES = ["suspended", "blacklisted", "inactive", "pending"];
const BLOCKED_LICENSE_STATUSES = ["suspended", "blacklisted", "pending"];

const clean = (value = "") => String(value || "").trim();
const cleanLower = (value = "") => clean(value).toLowerCase();
const cleanUpper = (value = "") => clean(value).toUpperCase();
const onlyDigits = (value = "") => clean(value).replace(/\D/g, "");

const namesMatch = (submitted = "", official = "") => {
  return cleanLower(submitted).replace(/\s+/g, " ") === cleanLower(official).replace(/\s+/g, " ");
};

const phonesMatch = (submitted = "", official = "") => {
  const submittedDigits = onlyDigits(submitted);
  const officialDigits = onlyDigits(official);

  if (!submittedDigits || !officialDigits) return false;

  return submittedDigits === officialDigits;
};

const isBlockedStatus = (status = "", blockedStatuses = BLOCKED_BRTA_STATUSES) => {
  return blockedStatuses.includes(cleanLower(status));
};

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

const findDriverLicense = async ({ brtaDriver, nid, licenseNumber }) => {
  const queries = [];
  const cleanLicense = cleanUpper(licenseNumber);
  const cleanNid = clean(nid);

  if (cleanLicense) queries.push({ licenseNumber: cleanLicense });
  if (brtaDriver?.brtaDriverId) queries.push({ brtaDriverId: brtaDriver.brtaDriverId });
  if (brtaDriver?.nid || cleanNid) queries.push({ nid: brtaDriver?.nid || cleanNid });

  if (queries.length === 0) return null;

  return BrtaDrivingLicense.findOne({ $or: queries }).lean();
};

const resolveVerifiedDriverRegistration = async ({ name, phone, nid, licenseNumber }) => {
  const cleanNid = clean(nid);

  if (!clean(name)) {
    throw new AppError("Full name is required for driver registration.", 400);
  }

  if (!clean(phone)) {
    throw new AppError("Phone number is required for driver registration.", 400);
  }

  if (!cleanNid) {
    throw new AppError("NID number is required for driver registration.", 400);
  }

  const brtaDriver = await BrtaDriver.findOne({ nid: cleanNid }).lean();

  if (!brtaDriver) {
    throw new AppError("No BRTA driver record was found for this NID.", 404);
  }

  if (isBlockedStatus(brtaDriver.status)) {
    throw new AppError(
      `This BRTA driver record is ${brtaDriver.status}. Registration is not allowed.`,
      403
    );
  }

  if (!namesMatch(name, brtaDriver.name)) {
    throw new AppError("Full name does not match the BRTA driver record.", 400);
  }

  if (!phonesMatch(phone, brtaDriver.phone)) {
    throw new AppError("Phone number does not match the BRTA driver record.", 400);
  }

  const brtaLicense = await findDriverLicense({
    brtaDriver,
    nid: cleanNid,
    licenseNumber,
  });

  if (!brtaLicense) {
    throw new AppError("No BRTA driving license record was found for this NID.", 404);
  }

  if (isBlockedStatus(brtaLicense.status, BLOCKED_LICENSE_STATUSES)) {
    throw new AppError(
      `This BRTA driving license is ${brtaLicense.status}. Registration is not allowed.`,
      403
    );
  }

  const duplicateIdentity = await User.findOne({
    role: "driver",
    $or: [
      { nid: cleanNid },
      { brtaDriverId: brtaDriver.brtaDriverId },
      { licenseNumber: brtaLicense.licenseNumber },
    ],
  });

  if (duplicateIdentity) {
    throw new AppError("A driver account is already registered with this BRTA identity.", 409);
  }

  return {
    brtaDriver,
    brtaLicense,
    nid: cleanNid,
    phone: clean(brtaDriver.phone),
    brtaDriverId: clean(brtaDriver.brtaDriverId),
    licenseNumber: cleanUpper(brtaLicense.licenseNumber),
  };
};

const resolveVerifiedOwnerRegistration = async ({ name, phone, nid }) => {
  const cleanNid = clean(nid);

  if (!clean(name)) {
    throw new AppError("Full name is required for owner registration.", 400);
  }

  if (!clean(phone)) {
    throw new AppError("Phone number is required for owner registration.", 400);
  }

  if (!cleanNid) {
    throw new AppError("NID number is required for owner registration.", 400);
  }

  const brtaOwner = await BrtaOwner.findOne({ nid: cleanNid }).lean();

  if (!brtaOwner) {
    throw new AppError("No BRTA owner record was found for this NID.", 404);
  }

  if (isBlockedStatus(brtaOwner.status)) {
    throw new AppError(
      `This BRTA owner record is ${brtaOwner.status}. Registration is not allowed.`,
      403
    );
  }

  if (!namesMatch(name, brtaOwner.name)) {
    throw new AppError("Full name does not match the BRTA owner record.", 400);
  }

  if (!phonesMatch(phone, brtaOwner.phone)) {
    throw new AppError("Phone number does not match the BRTA owner record.", 400);
  }

  const duplicateIdentity = await User.findOne({
    role: "owner",
    $or: [{ nid: cleanNid }, { brtaOwnerId: brtaOwner.brtaOwnerId }],
  });

  if (duplicateIdentity) {
    throw new AppError("An owner account is already registered with this BRTA identity.", 409);
  }

  return {
    brtaOwner,
    nid: cleanNid,
    phone: clean(brtaOwner.phone),
    brtaOwnerId: clean(brtaOwner.brtaOwnerId),
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

  if (!clean(name)) {
    throw new AppError("Full name is required.", 400);
  }

  if (!clean(email)) {
    throw new AppError("Email address is required.", 400);
  }

  if (!clean(phone)) {
    throw new AppError("Phone number is required.", 400);
  }

  if (!clean(nid)) {
    throw new AppError("NID number is required.", 400);
  }

  if (!password) {
    throw new AppError("Password is required.", 400);
  }

  if (!PUBLIC_REGISTER_ROLES.includes(role)) {
    throw new AppError("Public registration is only allowed for driver or owner accounts.", 403);
  }

  if (String(password).length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
  }

  const normalizedEmail = cleanLower(email);

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("User already exists with this email.", 409);
  }

  const verifiedIdentity =
    role === "driver"
      ? await resolveVerifiedDriverRegistration({ name, phone, nid, licenseNumber })
      : await resolveVerifiedOwnerRegistration({ name, phone, nid });

  const hashedPassword = await bcrypt.hash(String(password), 10);

  const brtaAvatar = await resolveBrtaAvatar({
    role,
    nid: verifiedIdentity.nid,
    phone: verifiedIdentity.phone || phone,
    brtaDriverId: verifiedIdentity.brtaDriverId || brtaDriverId,
    brtaOwnerId: verifiedIdentity.brtaOwnerId || brtaOwnerId,
    licenseNumber: verifiedIdentity.licenseNumber || licenseNumber,
  });

  const userData = {
    name: clean(name),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    status: "active",
    phone: clean(phone) || verifiedIdentity.phone || "",
    nid: verifiedIdentity.nid,
    avatarUrl: brtaAvatar.avatarUrl,
    avatarPublicId: brtaAvatar.avatarPublicId,
    avatarSource: brtaAvatar.avatarSource,
  };

  if (role === "driver") {
    userData.brtaDriverId = verifiedIdentity.brtaDriverId || brtaAvatar.brtaDriverId;
    userData.licenseNumber = verifiedIdentity.licenseNumber || brtaAvatar.licenseNumber;
  }

  if (role === "owner") {
    userData.brtaOwnerId = verifiedIdentity.brtaOwnerId || brtaAvatar.brtaOwnerId;
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

  if (!clean(email)) {
    throw new AppError("Email address is required.", 400);
  }

  if (!password) {
    throw new AppError("Password is required.", 400);
  }

  const normalizedEmail = cleanLower(email);

  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(String(password), user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (user.status !== "active") {
    throw new AppError(`Account is ${user.status}. Please contact admin.`, 403);
  }

  const loginUpdate = {
    lastLogin: new Date(),
  };

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

const SELF_PROFILE_ALLOWED_FIELDS = ["name", "email", "phone", "address"];

const SELF_PROFILE_BLOCKED_FIELDS = [
  "role",
  "status",
  "password",
  "nid",
  "brtaDriverId",
  "brtaOwnerId",
  "licenseNumber",
  "badge",
  "station",
  "rank",
  "avatarUrl",
  "avatarPublicId",
  "avatarSource",
];

const updateCurrentUser = async (userId, payload = {}) => {
  const existingUser = await User.findById(userId);

  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  const blockedField = SELF_PROFILE_BLOCKED_FIELDS.find((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );

  if (blockedField) {
    throw new AppError(
      `${blockedField} is a verified or role-managed field and cannot be changed from profile.`,
      403
    );
  }

  const update = {};

  if (payload.name !== undefined) {
    const name = clean(payload.name);

    if (!name) {
      throw new AppError("Full name is required.", 400);
    }

    update.name = name;
  }

  if (payload.email !== undefined) {
    const email = cleanLower(payload.email);

    if (!email) {
      throw new AppError("Email address is required.", 400);
    }

    const emailTaken = await User.findOne({
      email,
      _id: { $ne: userId },
    });

    if (emailTaken) {
      throw new AppError("Email is already used by another user.", 409);
    }

    update.email = email;
  }

  if (payload.phone !== undefined) {
    update.phone = clean(payload.phone);
  }

  if (payload.address !== undefined) {
    update.address = clean(payload.address);
  }

  const hasAllowedField = SELF_PROFILE_ALLOWED_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );

  if (!hasAllowedField) {
    return sanitizeUser(existingUser);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, runValidators: true }
  );

  return sanitizeUser(updatedUser);
};

module.exports = {
  sanitizeUser,
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
};
