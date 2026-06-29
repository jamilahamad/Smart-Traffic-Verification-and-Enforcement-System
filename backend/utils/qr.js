const VEHICLE_PREFIX = "STVES-VEH:";
const LICENSE_PREFIX = "STVES-LIC:";

const decodeSafe = (value = "") => {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (_) {
    return String(value || "");
  }
};

const normalizePlate = (value = "") => {
  return decodeSafe(value)
    .trim()
    .toUpperCase()
    .replace(/^STVES-VEH:/, "");
};

const normalizeLicense = (value = "") => {
  return decodeSafe(value)
    .trim()
    .toUpperCase()
    .replace(/^STVES-LIC:/, "");
};

const buildVehicleQR = (plate) => {
  const cleanPlate = normalizePlate(plate);
  return `${VEHICLE_PREFIX}${cleanPlate}`;
};

const buildLicenseQR = (licenseNumber) => {
  const cleanLicense = normalizeLicense(licenseNumber);
  return `${LICENSE_PREFIX}${cleanLicense}`;
};

const parseSTVESQR = (rawValue = "") => {
  const raw = decodeSafe(rawValue).trim();
  const upper = raw.toUpperCase();

  if (upper.startsWith(VEHICLE_PREFIX)) {
    const value = normalizePlate(raw);

    return {
      valid: Boolean(value),
      type: "vehicle",
      raw,
      value,
      qrCode: buildVehicleQR(value),
    };
  }

  if (upper.startsWith(LICENSE_PREFIX)) {
    const value = normalizeLicense(raw);

    return {
      valid: Boolean(value),
      type: "license",
      raw,
      value,
      qrCode: buildLicenseQR(value),
    };
  }

  return {
    valid: false,
    type: "unknown",
    raw,
    value: "",
    qrCode: raw,
  };
};

module.exports = {
  VEHICLE_PREFIX,
  LICENSE_PREFIX,
  normalizePlate,
  normalizeLicense,
  buildVehicleQR,
  buildLicenseQR,
  parseSTVESQR,
};