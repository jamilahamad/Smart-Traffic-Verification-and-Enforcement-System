import { ROLES } from './roles';

export const PAGES = {
  LANDING: 'landing',
  LOGIN: 'login',

  DASHBOARD: 'dashboard',
  PROFILE: 'profile',

  VERIFY: 'verify',
  QR_SCAN: 'qr-scan',
  CREATE_CASE: 'create-case',
  MY_CASES: 'my-cases',

  ALL_CASES: 'all-cases',
  MANAGE_USERS: 'manage-users',
  MANAGE_VEHICLES: 'manage-vehicles',
  BLACKLIST: 'blacklist',
  ANALYTICS: 'analytics',
  ACTIVITY_LOGS: 'activity-logs',
  LICENSE_RENEWALS: 'license-renewals',
  BRTA_PHOTOS: 'brta-photos',
  VIOLATION_MANAGEMENT: 'violation-management',

  MY_LICENSE: 'my-license',
  MY_VIOLATIONS: 'my-violations',

  MY_VEHICLES: 'my-vehicles',
  ASSIGN_DRIVERS: 'assign-drivers',
  OWNER_VIOLATIONS: 'owner-violations',
};

export const PUBLIC_PAGES = [
  PAGES.LANDING,
  PAGES.LOGIN,
];

export const PAGE_ACCESS = {
  [PAGES.DASHBOARD]: [ROLES.ADMIN, ROLES.POLICE, ROLES.DRIVER, ROLES.OWNER],
  [PAGES.PROFILE]: [ROLES.ADMIN, ROLES.POLICE, ROLES.DRIVER, ROLES.OWNER],

  [PAGES.VERIFY]: [ROLES.POLICE],
  [PAGES.QR_SCAN]: [ROLES.POLICE],
  [PAGES.CREATE_CASE]: [ROLES.POLICE],
  [PAGES.MY_CASES]: [ROLES.POLICE],

  [PAGES.ALL_CASES]: [ROLES.ADMIN],
  [PAGES.MANAGE_USERS]: [ROLES.ADMIN],
  [PAGES.MANAGE_VEHICLES]: [ROLES.ADMIN],
  [PAGES.BLACKLIST]: [ROLES.ADMIN],
  [PAGES.ANALYTICS]: [ROLES.ADMIN],
  [PAGES.ACTIVITY_LOGS]: [ROLES.ADMIN],
  [PAGES.LICENSE_RENEWALS]: [ROLES.ADMIN],
  [PAGES.BRTA_PHOTOS]: [ROLES.ADMIN],
  [PAGES.VIOLATION_MANAGEMENT]: [ROLES.ADMIN],

  [PAGES.MY_LICENSE]: [ROLES.DRIVER],
  [PAGES.MY_VIOLATIONS]: [ROLES.DRIVER],

  [PAGES.MY_VEHICLES]: [ROLES.OWNER],
  [PAGES.ASSIGN_DRIVERS]: [ROLES.OWNER],
  [PAGES.OWNER_VIOLATIONS]: [ROLES.OWNER],
};

export const PAGE_ALIASES = {
  home: PAGES.DASHBOARD,
  cases: PAGES.MY_CASES,
  'owner-profile': PAGES.PROFILE,
  'vehicle-violations': PAGES.OWNER_VIOLATIONS,
};

export const normalizePage = (page) => {
  return PAGE_ALIASES[page] || page || PAGES.DASHBOARD;
};

export const canAccessPage = (role, page) => {
  const normalizedPage = normalizePage(page);
  const allowedRoles = PAGE_ACCESS[normalizedPage];

  if (!allowedRoles) {
    return true;
  }

  return allowedRoles.includes(role);
};