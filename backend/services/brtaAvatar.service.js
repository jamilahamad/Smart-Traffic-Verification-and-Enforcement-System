const BrtaDriver = require("../models/BrtaDriver");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaOwner = require("../models/BrtaOwner");

const clean = (value = "") => String(value || "").trim();
const cleanUpper = (value = "") => clean(value).toUpperCase();

const buildAvatarPayload = ({ photoUrl = "", photoPublicId = "" } = {}) => {
  if (!photoUrl) {
    return {
      avatarUrl: "",
      avatarPublicId: "",
      avatarSource: "default",
    };
  }

  return {
    avatarUrl: photoUrl,
    avatarPublicId: photoPublicId || "",
    avatarSource: "brta",
  };
};

const findBrtaDriver = async ({ nid, phone, brtaDriverId, licenseNumber } = {}) => {
  const queries = [];

  const cleanBrtaDriverId = clean(brtaDriverId);
  const cleanNid = clean(nid);
  const cleanPhone = clean(phone);
  const cleanLicenseNumber = cleanUpper(licenseNumber);

  if (cleanBrtaDriverId) queries.push({ brtaDriverId: cleanBrtaDriverId });
  if (cleanNid) queries.push({ nid: cleanNid });
  if (cleanPhone) queries.push({ phone: cleanPhone });

  if (cleanLicenseNumber) {
    const brtaLicense = await BrtaDrivingLicense.findOne({
      licenseNumber: cleanLicenseNumber,
    }).lean();

    if (brtaLicense?.brtaDriverId) {
      queries.unshift({ brtaDriverId: brtaLicense.brtaDriverId });
    }

    if (brtaLicense?.nid) {
      queries.push({ nid: brtaLicense.nid });
    }
  }

  if (queries.length === 0) return null;

  return BrtaDriver.findOne({ $or: queries }).lean();
};

const findBrtaOwner = async ({ nid, phone, brtaOwnerId } = {}) => {
  const queries = [];

  const cleanBrtaOwnerId = clean(brtaOwnerId);
  const cleanNid = clean(nid);
  const cleanPhone = clean(phone);

  if (cleanBrtaOwnerId) queries.push({ brtaOwnerId: cleanBrtaOwnerId });
  if (cleanNid) queries.push({ nid: cleanNid });
  if (cleanPhone) queries.push({ phone: cleanPhone });

  if (queries.length === 0) return null;

  return BrtaOwner.findOne({ $or: queries }).lean();
};

const resolveBrtaAvatar = async ({
  role,
  nid,
  phone,
  brtaDriverId,
  brtaOwnerId,
  licenseNumber,
} = {}) => {
  if (role === "driver") {
    const brtaDriver = await findBrtaDriver({
      nid,
      phone,
      brtaDriverId,
      licenseNumber,
    });

    return {
      ...buildAvatarPayload(brtaDriver || {}),
      brtaDriverId: brtaDriver?.brtaDriverId || clean(brtaDriverId),
      licenseNumber: cleanUpper(licenseNumber),
    };
  }

  if (role === "owner") {
    const brtaOwner = await findBrtaOwner({
      nid,
      phone,
      brtaOwnerId,
    });

    return {
      ...buildAvatarPayload(brtaOwner || {}),
      brtaOwnerId: brtaOwner?.brtaOwnerId || clean(brtaOwnerId),
    };
  }

  return buildAvatarPayload();
};

module.exports = {
  resolveBrtaAvatar,
};