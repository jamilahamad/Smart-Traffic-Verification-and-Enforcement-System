export const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return item._id || item.id || item.value || '';
};

export const getMongoId = getId;

export const getUserId = (user) => {
  return getId(user);
};

export const getVehicleId = (vehicle) => {
  return getId(vehicle);
};

export const getLicenseId = (license) => {
  return getId(license);
};

export const getViolationId = (violation) => {
  return getId(violation);
};

export const idsMatch = (left, right) => {
  const leftId = String(getId(left));
  const rightId = String(getId(right));

  return Boolean(leftId && rightId && leftId === rightId);
};

export const includesId = (items = [], target) => {
  const targetId = String(getId(target));

  if (!targetId || !Array.isArray(items)) {
    return false;
  }

  return items.some((item) => String(getId(item)) === targetId);
};