const statusVariantMap = {
  active: 'success',
  valid: 'success',
  approved: 'success',
  paid: 'primary',
  compliant: 'success',

  pending: 'warning',
  expiring: 'warning',
  review: 'warning',

  suspended: 'danger',
  blacklisted: 'danger',
  expired: 'danger',
  dismissed: 'danger',
  inactive: 'danger',
  invalid: 'danger',
  unpaid: 'danger',
  non_compliant: 'danger',

  waived: 'purple',
  unknown: 'default',
};

export const normalizeStatus = (status, fallback = 'unknown') => {
  return String(status || fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
};

export const formatStatusLabel = (status, fallback = 'Unknown') => {
  const normalized = normalizeStatus(status, '');

  if (!normalized) {
    return fallback;
  }

  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const getStatusVariant = (status) => {
  const normalized = normalizeStatus(status);
  return statusVariantMap[normalized] || 'default';
};

export const isPositiveStatus = (status) => {
  const normalized = normalizeStatus(status);

  return ['active', 'valid', 'approved', 'paid', 'compliant'].includes(normalized);
};

export const isNegativeStatus = (status) => {
  const normalized = normalizeStatus(status);

  return [
    'suspended',
    'blacklisted',
    'expired',
    'dismissed',
    'inactive',
    'invalid',
    'unpaid',
    'non_compliant',
  ].includes(normalized);
};

export const getComplianceStatus = (item) => {
  if (!item) {
    return {
      isCompliant: false,
      status: 'unknown',
      label: 'Unknown',
      variant: 'default',
    };
  }

  const rawStatus = item.status || item.complianceStatus;
  const status = normalizeStatus(rawStatus);

  const hasIssues =
    Array.isArray(item.issues) && item.issues.length > 0;

  const isCompliant =
    item.isCompliant === true ||
    item.compliant === true ||
    (!hasIssues && ['active', 'valid', 'approved', 'paid'].includes(status));

  return {
    isCompliant,
    status: isCompliant ? 'compliant' : status,
    label: isCompliant ? 'Compliant' : formatStatusLabel(status),
    variant: isCompliant ? 'success' : getStatusVariant(status),
  };
};