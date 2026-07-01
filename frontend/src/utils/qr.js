export const QR_TYPES = {
  VEHICLE: 'vehicle',
  LICENSE: 'license',
  UNKNOWN: 'unknown',
};

export const QR_PREFIXES = {
  VEHICLE: 'STVES-VEH:',
  LICENSE: 'STVES-LIC:',
};

const cleanQRValue = (value) => {
  return String(value || '').trim();
};

export const buildVehicleQR = (registrationNumber) => {
  const plate = cleanQRValue(registrationNumber);
  return plate ? `${QR_PREFIXES.VEHICLE}${plate}` : '';
};

export const buildLicenseQR = (licenseNumber) => {
  const number = cleanQRValue(licenseNumber);
  return number ? `${QR_PREFIXES.LICENSE}${number}` : '';
};

export const normalizeQRValue = (value) => {
  const raw = cleanQRValue(value);

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export const parseSTVESQR = (value) => {
  const raw = normalizeQRValue(value);
  const upperRaw = raw.toUpperCase();

  if (!raw) {
    return {
      isValid: false,
      type: QR_TYPES.UNKNOWN,
      value: '',
      raw: '',
      prefix: '',
      error: 'QR value is empty.',
    };
  }

  if (upperRaw.startsWith(QR_PREFIXES.VEHICLE)) {
    const plate = raw.slice(QR_PREFIXES.VEHICLE.length).trim();

    return {
      isValid: Boolean(plate),
      type: QR_TYPES.VEHICLE,
      value: plate,
      registrationNumber: plate,
      raw,
      prefix: QR_PREFIXES.VEHICLE,
      error: plate ? '' : 'Vehicle registration number missing.',
    };
  }

  if (upperRaw.startsWith(QR_PREFIXES.LICENSE)) {
    const licenseNumber = raw.slice(QR_PREFIXES.LICENSE.length).trim();

    return {
      isValid: Boolean(licenseNumber),
      type: QR_TYPES.LICENSE,
      value: licenseNumber,
      licenseNumber,
      raw,
      prefix: QR_PREFIXES.LICENSE,
      error: licenseNumber ? '' : 'License number missing.',
    };
  }

  return {
    isValid: false,
    type: QR_TYPES.UNKNOWN,
    value: raw,
    raw,
    prefix: '',
    error: 'Unsupported STVES QR format.',
  };
};

export const isVehicleQR = (value) => {
  return parseSTVESQR(value).type === QR_TYPES.VEHICLE;
};

export const isLicenseQR = (value) => {
  return parseSTVESQR(value).type === QR_TYPES.LICENSE;
};

export const getQRDisplayLabel = (value) => {
  const parsed = parseSTVESQR(value);

  if (parsed.type === QR_TYPES.VEHICLE) {
    return `Vehicle: ${parsed.value}`;
  }

  if (parsed.type === QR_TYPES.LICENSE) {
    return `License: ${parsed.value}`;
  }

  return 'Invalid QR';
};