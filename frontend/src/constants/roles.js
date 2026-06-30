export const ROLES = {
  ADMIN: 'admin',
  POLICE: 'police',
  DRIVER: 'driver',
  OWNER: 'owner',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'System Administrator',
  [ROLES.POLICE]: 'Traffic Police Officer',
  [ROLES.DRIVER]: 'Licensed Driver',
  [ROLES.OWNER]: 'Vehicle Owner',
};

export const ROLE_BADGE_COLORS = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-700',
  [ROLES.POLICE]: 'bg-blue-100 text-blue-700',
  [ROLES.DRIVER]: 'bg-green-100 text-green-700',
  [ROLES.OWNER]: 'bg-purple-100 text-purple-700',
};

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.POLICE, label: ROLE_LABELS[ROLES.POLICE] },
  { value: ROLES.DRIVER, label: ROLE_LABELS[ROLES.DRIVER] },
  { value: ROLES.OWNER, label: ROLE_LABELS[ROLES.OWNER] },
];

export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

export const canAccessRole = (userRole, allowedRoles = []) => {
  if (!allowedRoles.length) {
    return true;
  }

  return allowedRoles.includes(userRole);
};