export const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const formatDate = (value, fallback = 'N/A') => {
  if (!isValidDate(value)) {
    return fallback;
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value, fallback = 'N/A') => {
  if (!isValidDate(value)) {
    return fallback;
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getDaysUntil = (value) => {
  if (!isValidDate(value)) {
    return null;
  }

  const today = new Date();
  const targetDate = new Date(value);

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const difference = targetDate.getTime() - today.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
};

export const isExpired = (value) => {
  const days = getDaysUntil(value);
  return days !== null && days < 0;
};

export const getExpiryStatus = (value) => {
  const days = getDaysUntil(value);

  if (days === null) {
    return {
      status: 'unknown',
      label: 'Unknown',
      days: null,
      variant: 'default',
    };
  }

  if (days < 0) {
    return {
      status: 'expired',
      label: `Expired ${Math.abs(days)} day(s) ago`,
      days,
      variant: 'danger',
    };
  }

  if (days <= 30) {
    return {
      status: 'expiring',
      label: `Expires in ${days} day(s)`,
      days,
      variant: 'warning',
    };
  }

  return {
    status: 'valid',
    label: `Valid for ${days} day(s)`,
    days,
    variant: 'success',
  };
};