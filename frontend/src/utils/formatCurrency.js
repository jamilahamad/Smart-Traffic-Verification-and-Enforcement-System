export const safeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

export const formatNumber = (value, fallback = '0') => {
  const numberValue = safeNumber(value, null);

  if (numberValue === null) {
    return fallback;
  }

  return numberValue.toLocaleString('en-US');
};

export const formatCurrency = (value, options = {}) => {
  const {
    symbol = '৳',
    fallback = '৳0',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  const numberValue = safeNumber(value, null);

  if (numberValue === null) {
    return fallback;
  }

  return `${symbol}${numberValue.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
};

export const formatBDT = (value) => {
  return formatCurrency(value, {
    symbol: '৳',
    fallback: '৳0',
  });
};