export const USER_STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BLACKLISTED: 'blacklisted',
};

export const CASE_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DISMISSED: 'dismissed',
  PAID: 'paid',
};

export const PAYMENT_STATUSES = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  WAIVED: 'waived',
};

export const VEHICLE_STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BLACKLISTED: 'blacklisted',
};

export const LICENSE_STATUSES = {
  VALID: 'valid',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
};

export const STATUS_LABELS = {
  active: 'Active',
  valid: 'Valid',
  pending: 'Pending',
  approved: 'Approved',
  dismissed: 'Dismissed',
  paid: 'Paid',
  unpaid: 'Unpaid',
  waived: 'Waived',
  suspended: 'Suspended',
  blacklisted: 'Blacklisted',
  expired: 'Expired',
  inactive: 'Inactive',
};

export const STATUS_VARIANTS = {
  active: 'success',
  valid: 'success',
  approved: 'success',
  paid: 'primary',

  pending: 'warning',

  suspended: 'danger',
  blacklisted: 'danger',
  expired: 'danger',
  dismissed: 'danger',
  inactive: 'danger',
  unpaid: 'danger',

  waived: 'purple',
};

export const getStatusLabel = (status) => {
  return STATUS_LABELS[String(status || '').toLowerCase()] || 'Unknown';
};

export const getStatusVariant = (status) => {
  return STATUS_VARIANTS[String(status || '').toLowerCase()] || 'default';
};