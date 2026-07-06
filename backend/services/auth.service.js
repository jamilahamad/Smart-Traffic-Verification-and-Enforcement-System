const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const BrtaDriver = require("../models/BrtaDriver");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaOwner = require("../models/BrtaOwner");
const AppError = require("../utils/AppError");
const generateToken = require("../utils/generateToken");
const { resolveBrtaAvatar } = require("./brtaAvatar.service");
const {
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail,
} = require("./email.service");
const MAX_PASSWORD_RESET_OTP_ATTEMPTS = 5;
const PendingPasswordReset = require("../models/PendingPasswordReset");

const PUBLIC_REGISTER_ROLES = ["driver", "owner"];
const BLOCKED_BRTA_STATUSES = ["suspended", "blacklisted", "inactive", "pending"];
const BLOCKED_LICENSE_STATUSES = ["suspended", "blacklisted", "pending"];
const REGISTRATION_OTP_LENGTH = 6;
const MAX_REGISTRATION_OTP_ATTEMPTS = 5;

const clean = (value = "") => String(value || "").trim();
const cleanLower = (value = "") => clean(value).toLowerCase();
const cleanUpper = (value = "") => clean(value).toUpperCase();
const onlyDigits = (value = "") => clean(value).replace(/\D/g, "");

const getRegistrationOtpMinutes = () => {
  const minutes = Number(process.env.REGISTRATION_OTP_MINUTES || 10);

  return Number.isFinite(minutes) && minutes > 0 ? minutes : 10;
};

const generateRegistrationOtp = () => {
  const min = 10 ** (REGISTRATION_OTP_LENGTH - 1);
  const max = 10 ** REGISTRATION_OTP_LENGTH;

  return String(crypto.randomInt(min, max));
};

const getOtpExpiresAt = () => {
  return new Date(Date.now() + getRegistrationOtpMinutes() * 60 * 1000);
};

const formatOfficialAddress = (address = {}) => {
  if (!address || typeof address !== "object") {
    return "";
  }

  const parts = [
    address.line,
    address.city,
    address.district,
    address.division,
  ]
    .map(clean)
    .filter(Boolean);

  return [...new Set(parts)].join(", ");
};

const resolveOfficialAddressForUser = async (user = {}) => {
  const role = cleanLower(user.role);

  if (role === "driver") {
    const queries = [];

    if (clean(user.brtaDriverId)) {
      queries.push({ brtaDriverId: clean(user.brtaDriverId) });
    }

    if (clean(user.nid)) {
      queries.push({ nid: clean(user.nid) });
    }

    if (queries.length === 0) {
      return "";
    }

    const brtaDriver = await BrtaDriver.findOne({ $or: queries }).lean();

    return formatOfficialAddress(brtaDriver?.address);
  }

  if (role === "owner") {
    const queries = [];

    if (clean(user.brtaOwnerId)) {
      queries.push({ brtaOwnerId: clean(user.brtaOwnerId) });
    }

    if (clean(user.nid)) {
      queries.push({ nid: clean(user.nid) });
    }

    if (queries.length === 0) {
      return "";
    }

    const brtaOwner = await BrtaOwner.findOne({ $or: queries }).lean();

    return formatOfficialAddress(brtaOwner?.address);
  }

  return "";
};

const syncOfficialAddressForUser = async (user) => {
  if (!user) {
    return user;
  }

  if (clean(user.address)) {
    return user;
  }

  const officialAddress = await resolveOfficialAddressForUser(user);

  if (!officialAddress) {
    return user;
  }

  user.address = officialAddress;

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        address: officialAddress,
      },
    }
  );

  return user;
};

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

const isSuperAdminUser = (user = {}) => {
  return user.role === "admin" && user.adminLevel === "super_admin";
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
    adminLevel: obj.role === "admin" ? obj.adminLevel || "admin" : "",
    isSuperAdmin: isSuperAdminUser(obj),
    isProtected: isSuperAdminUser(obj),
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
    passwordUpdatedAt: obj.passwordUpdatedAt || null,
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

const buildVerifiedRegistrationUserData = async (payload) => {
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
  } = payload;

  const cleanRole = cleanLower(role || "driver");

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

  if (!PUBLIC_REGISTER_ROLES.includes(cleanRole)) {
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
    cleanRole === "driver"
      ? await resolveVerifiedDriverRegistration({ name, phone, nid, licenseNumber })
      : await resolveVerifiedOwnerRegistration({ name, phone, nid });

  const hashedPassword = await bcrypt.hash(String(password), 10);

  const brtaAvatar = await resolveBrtaAvatar({
    role: cleanRole,
    nid: verifiedIdentity.nid,
    phone: verifiedIdentity.phone || phone,
    brtaDriverId: verifiedIdentity.brtaDriverId || brtaDriverId,
    brtaOwnerId: verifiedIdentity.brtaOwnerId || brtaOwnerId,
    licenseNumber: verifiedIdentity.licenseNumber || licenseNumber,
  });

  const officialAddress =
    cleanRole === "driver"
      ? formatOfficialAddress(verifiedIdentity.brtaDriver?.address)
      : formatOfficialAddress(verifiedIdentity.brtaOwner?.address);

  const userData = {
    name: clean(name),
    email: normalizedEmail,
    password: hashedPassword,
    role: cleanRole,
    status: "active",
    phone: clean(phone) || verifiedIdentity.phone || "",
    nid: verifiedIdentity.nid,
    address: officialAddress,
    avatarUrl: brtaAvatar.avatarUrl,
    avatarPublicId: brtaAvatar.avatarPublicId,
    avatarSource: brtaAvatar.avatarSource,
  };

  if (cleanRole === "driver") {
    userData.brtaDriverId = verifiedIdentity.brtaDriverId || brtaAvatar.brtaDriverId;
    userData.licenseNumber = verifiedIdentity.licenseNumber || brtaAvatar.licenseNumber;
  }

  if (cleanRole === "owner") {
    userData.brtaOwnerId = verifiedIdentity.brtaOwnerId || brtaAvatar.brtaOwnerId;
  }

  return userData;
};

const requestRegistrationOtp = async (payload) => {
  const userData = await buildVerifiedRegistrationUserData(payload);
  const otp = generateRegistrationOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = getOtpExpiresAt();

  await PendingRegistration.findOneAndUpdate(
    { email: userData.email },
    {
      $set: {
        email: userData.email,
        role: userData.role,
        otpHash,
        attempts: 0,
        expiresAt,
        userData,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  try {
    await sendRegistrationOtpEmail({
      to: userData.email,
      name: userData.name,
      otp,
      expiresInMinutes: getRegistrationOtpMinutes(),
    });
  } catch (error) {
    await PendingRegistration.deleteOne({ email: userData.email });

    throw error;
  }

  return {
    email: userData.email,
    role: userData.role,
    expiresAt,
    expiresInMinutes: getRegistrationOtpMinutes(),
  };
};

const verifyRegistrationOtp = async (payload = {}) => {
  const email = cleanLower(payload.email);
  const otp = clean(payload.otp || payload.code);

  if (!email) {
    throw new AppError("Email address is required.", 400);
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new AppError("Enter the 6 digit verification code.", 400);
  }

  const pending = await PendingRegistration.findOne({ email });

  if (!pending) {
    throw new AppError("No pending registration was found for this email. Please register again.", 404);
  }

  if (pending.expiresAt <= new Date()) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new AppError("Verification code has expired. Please request a new code.", 400);
  }

  if (pending.attempts >= MAX_REGISTRATION_OTP_ATTEMPTS) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new AppError("Too many wrong attempts. Please register again and request a new code.", 429);
  }

  const isMatch = await bcrypt.compare(otp, pending.otpHash);

  if (!isMatch) {
    pending.attempts += 1;
    await pending.save();

    const remainingAttempts = Math.max(
      MAX_REGISTRATION_OTP_ATTEMPTS - pending.attempts,
      0
    );

    throw new AppError(
      `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
      400
    );
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new AppError("User already exists with this email.", 409);
  }

  const user = await User.create(pending.userData);
  await PendingRegistration.deleteOne({ _id: pending._id });

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user),
  };
};

const requestPasswordResetOtp = async (payload = {}) => {
  const email = cleanLower(payload.email);

  if (!email) {
    throw new AppError("Email address is required.", 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("No account was found with this email address.", 404);
  }

  if (user.status !== "active") {
    throw new AppError(`Account is ${user.status}. Please contact admin.`, 403);
  }

  const otp = generateRegistrationOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = getOtpExpiresAt();

  await PendingPasswordReset.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        otpHash,
        attempts: 0,
        expiresAt,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  try {
    await sendPasswordResetOtpEmail({
      to: email,
      name: user.name,
      otp,
      expiresInMinutes: getRegistrationOtpMinutes(),
    });
  } catch (error) {
    await PendingPasswordReset.deleteOne({ email });
    throw error;
  }

  return {
    email,
    expiresAt,
    expiresInMinutes: getRegistrationOtpMinutes(),
  };
};

const resetPasswordWithOtp = async (payload = {}) => {
  const email = cleanLower(payload.email);
  const otp = clean(payload.otp || payload.code);
  const password = String(payload.password || "");
  const confirmPassword = String(payload.confirmPassword || payload.password || "");

  if (!email) {
    throw new AppError("Email address is required.", 400);
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new AppError("Enter the 6 digit password reset code.", 400);
  }

  if (!password || password.length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
  }

  if (password !== confirmPassword) {
    throw new AppError("Password and confirm password do not match.", 400);
  }

  const pending = await PendingPasswordReset.findOne({ email });

  if (!pending) {
    throw new AppError("No pending password reset request was found. Please request a new code.", 404);
  }

  if (pending.expiresAt <= new Date()) {
    await PendingPasswordReset.deleteOne({ _id: pending._id });
    throw new AppError("Password reset code has expired. Please request a new code.", 400);
  }

  if (pending.attempts >= MAX_PASSWORD_RESET_OTP_ATTEMPTS) {
    await PendingPasswordReset.deleteOne({ _id: pending._id });
    throw new AppError("Too many wrong attempts. Please request a new code.", 429);
  }

  const isMatch = await bcrypt.compare(otp, pending.otpHash);

  if (!isMatch) {
    pending.attempts += 1;
    await pending.save();

    const remainingAttempts = Math.max(
      MAX_PASSWORD_RESET_OTP_ATTEMPTS - pending.attempts,
      0
    );

    throw new AppError(
      `Invalid password reset code. ${remainingAttempts} attempt(s) remaining.`,
      400
    );
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    await PendingPasswordReset.deleteOne({ _id: pending._id });
    throw new AppError("User not found.", 404);
  }

  user.password = await bcrypt.hash(password, 10);
  await user.save();

  await PendingPasswordReset.deleteOne({ _id: pending._id });

  return {
    email,
  };
};

const registerUser = requestRegistrationOtp;

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
  const syncedUser = await syncOfficialAddressForUser(freshUser);
  const token = generateToken(syncedUser);

  return {
    token,
    user: sanitizeUser(syncedUser),
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const syncedUser = await syncOfficialAddressForUser(user);

  return sanitizeUser(syncedUser);
};

const changeCurrentPassword = async (userId, payload = {}) => {
  const currentPassword = String(payload.currentPassword || "");
  const newPassword = String(payload.newPassword || payload.password || "");
  const confirmPassword = String(
    payload.confirmPassword || payload.newPassword || payload.password || ""
  );

  if (!currentPassword) {
    throw new AppError("Current password is required.", 400);
  }

  if (!newPassword || newPassword.length < 6) {
    throw new AppError("New password must be at least 6 characters.", 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("New password and confirm password do not match.", 400);
  }

  if (currentPassword === newPassword) {
    throw new AppError("New password must be different from current password.", 400);
  }

  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.status !== "active") {
    throw new AppError(`Account is ${user.status}. Please contact admin.`, 403);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw new AppError("Current password is incorrect.", 400);
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordUpdatedAt = new Date();

  await user.save();

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
    { returnDocument: "after", runValidators: true }
  );

  return sanitizeUser(updatedUser);
};

module.exports = {
  sanitizeUser,
  registerUser,
  requestRegistrationOtp,
  verifyRegistrationOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  changeCurrentPassword,
};
