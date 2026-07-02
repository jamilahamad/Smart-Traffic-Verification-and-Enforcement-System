// ============================================================
// Backend Utility Functions
// ============================================================

/**
 * Generate unique IDs
 */
function generateId(prefix = 'STR') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate E-Challan case ID
 */
function generateCaseId() {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `EC-${year}-${num}`;
}

/**
 * Check if a date string is expired
 */
function isExpired(dateString) {
  if (!dateString) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateString < today;
}

/**
 * Check if expiring within N days
 */
function isExpiringSoon(dateString, days = 30) {
  if (!dateString) return false;
  const today = new Date();
  const expiryDate = new Date(dateString);
  const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= days;
}

/**
 * Format currency (Bangladesh Taka)
 */
function formatCurrency(amount) {
  return `৳${amount.toLocaleString('en-BD')}`;
}

/**
 * Sanitize user input
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Pagination helper
 */
function paginate(items, page = 1, limit = 20) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = items.length;
  const pages = Math.ceil(total / limit);

  return {
    data: items.slice(startIndex, endIndex),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Response helpers
 */
const respond = {
  success: (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      ...data,
    });
  },

  error: (res, message = 'Error', statusCode = 400, errors = null) => {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  },

  notFound: (res, resource = 'Resource') => {
    res.status(404).json({
      success: false,
      message: `${resource} not found.`,
    });
  },

  unauthorized: (res, message = 'Unauthorized access.') => {
    res.status(401).json({
      success: false,
      message,
    });
  },

  forbidden: (res, message = 'Access forbidden.') => {
    res.status(403).json({
      success: false,
      message,
    });
  },
};

/**
 * Async error handler wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  generateId,
  generateCaseId,
  isExpired,
  isExpiringSoon,
  formatCurrency,
  sanitize,
  paginate,
  respond,
  asyncHandler,
};
