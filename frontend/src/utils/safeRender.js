export const safeText = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
};

export const safeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

export const safeObject = (value) => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

export const getNestedValue = (object, path, fallback = 'N/A') => {
  if (!object || !path) {
    return fallback;
  }

  const value = String(path)
    .split('.')
    .reduce((current, key) => current?.[key], object);

  return value === undefined || value === null || value === '' ? fallback : value;
};

export const joinText = (items = [], separator = ', ', fallback = 'N/A') => {
  const text = safeArray(items)
    .map((item) => safeText(item, ''))
    .filter(Boolean)
    .join(separator);

  return text || fallback;
};

export const getPersonName = (person, fallback = 'N/A') => {
  if (!person) {
    return fallback;
  }

  if (typeof person === 'string') {
    return person;
  }

  return person.name || person.fullName || person.email || fallback;
};

export const getVehiclePlate = (vehicle, fallback = 'N/A') => {
  if (!vehicle) {
    return fallback;
  }

  if (typeof vehicle === 'string') {
    return vehicle;
  }

  return (
    vehicle.registrationNumber ||
    vehicle.plateNumber ||
    vehicle.plate ||
    fallback
  );
};

export const getLicenseNumber = (license, fallback = 'N/A') => {
  if (!license) {
    return fallback;
  }

  if (typeof license === 'string') {
    return license;
  }

  return license.licenseNumber || license.number || fallback;
};