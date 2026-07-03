const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export { API_BASE_URL };

export const tokenStorage = {
  getToken() {
    return localStorage.getItem('stves_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('stves_token', token);
    }
  },

  removeToken() {
    localStorage.removeItem('stves_token');
    localStorage.removeItem('stves_user');
  },

  getUser() {
    try {
      const raw = localStorage.getItem('stves_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem('stves_user');
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('stves_user', JSON.stringify(user));
    }
  },
};

const hasBody = (body) => body !== undefined && body !== null;

const isFormDataBody = (body) => {
  return typeof FormData !== 'undefined' && body instanceof FormData;
};

const normalizePath = (path) => {
  return path.startsWith('/') ? path : `/${path}`;
};

const buildUrl = (path, params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  const cleanPath = normalizePath(path);

  return queryString
    ? `${API_BASE_URL}${cleanPath}?${queryString}`
    : `${API_BASE_URL}${cleanPath}`;
};

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const request = async (endpoint, options = {}) => {
  const token = tokenStorage.getToken();

  const headers = {
    ...(options.headers || {}),
  };

  const isFormData = isFormDataBody(options.body);

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (hasBody(options.body)) {
    config.body = isFormData ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(endpoint, options.params), config);
  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.data?.message ||
      data?.errors?.[0]?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (data?.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data?.data || data;
};
const normalizeStatsResponse = (data = {}) => {
  const stats = data.stats || data.analytics || data;

  return {
    ...data,
    stats,
  };
};

const normalizeStatusPayload = (statusOrPayload, fallbackNote = '') => {
  if (typeof statusOrPayload === 'object' && statusOrPayload !== null) {
    return {
      ...statusOrPayload,
      note:
        statusOrPayload.note ||
        statusOrPayload.reviewNote ||
        statusOrPayload.adminReviewNote ||
        fallbackNote,
    };
  }

  return {
    status: statusOrPayload,
    note: fallbackNote,
  };
};

const api = {
  baseUrl: API_BASE_URL,

  // ---------------- AUTH ----------------
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  me: () => request('/auth/me'),

  // ---------------- USERS ----------------
  getUsers: () => request('/users'),

  getUserById: (id) => request(`/users/${id}`),

  createUser: (payload) =>
    request('/users', {
      method: 'POST',
      body: payload,
    }),

  updateUser: (id, payload) =>
    request(`/users/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  updateProfile: (payloadOrId, maybePayload) => {
    const payload = maybePayload || payloadOrId || {};

    return request('/auth/me', {
      method: 'PATCH',
      body: payload,
    });
  },

  updateUserStatus: (id, status) =>
    request(`/users/${id}`, {
      method: 'PATCH',
      body: { status },
    }),

  // ---------------- ANALYTICS / LOGS ----------------
  getAnalyticsStats: async () => {
    const data = await request('/analytics');
    return normalizeStatsResponse(data);
  },

  getAnalytics: async () => {
    const data = await request('/analytics');
    return normalizeStatsResponse(data);
  },

  getActivityLogs: () => request('/logs/activity'),

  getAdminCases: () => request('/admin/cases'),

  uploadBrtaDriverPhoto: (brtaDriverId, file) => {
    const formData = new FormData();
    formData.append('photo', file);

    return request(`/admin/brta/drivers/${encodeURIComponent(brtaDriverId)}/photo`, {
      method: 'POST',
      body: formData,
    });
  },

  uploadBrtaOwnerPhoto: (brtaOwnerId, file) => {
    const formData = new FormData();
    formData.append('photo', file);

    return request(`/admin/brta/owners/${encodeURIComponent(brtaOwnerId)}/photo`, {
      method: 'POST',
      body: formData,
    });
  },

  getVerificationLogs: () => request('/logs/verification'),

  getMyVerificationLogs: () => request('/verification-logs/my'),

  // ---------------- VEHICLES ----------------
  getVehicles: () => request('/vehicles'),

  getMyVehicles: () => request('/vehicles/my'),

  createVehicle: (payload) =>
    request('/vehicles', {
      method: 'POST',
      body: payload,
    }),

  registerVehicle: (payload) =>
    request('/vehicles', {
      method: 'POST',
      body: payload,
    }),

  addVehicle: (payload) =>
    request('/vehicles', {
      method: 'POST',
      body: payload,
    }),

  updateVehicle: (id, payload) =>
    request(`/vehicles/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  updateVehicleStatus: (id, status) =>
    request(`/vehicles/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  verifyVehicle: (registrationNumber, licenseNumber = '') =>
    request(`/vehicles/verify/${encodeURIComponent(registrationNumber)}`, {
      params: {
        licenseNumber,
      },
    }),

  // ---------------- LICENSES ----------------
  getLicenses: () => request('/licenses'),

  getMyLicenses: () => request('/licenses/my'),

  getDriverLicenses: () => request('/driver/licenses/me'),

  getMyRenewalRequests: () => request('/license-renewals/my'),

  submitLicenseRenewalProof: (payload) =>
    request('/license-renewals/submit', {
      method: 'POST',
      body: payload,
    }),

  getPendingRenewalRequests: () => request('/license-renewals/pending'),

  reviewRenewalRequest: (id, payload) =>
    request(`/license-renewals/${id}/review`, {
      method: 'PATCH',
      body: payload,
    }),

  getMyDriverViolations: () => request('/driver/violations/me'),

  createLicense: (payload) =>
    request('/licenses', {
      method: 'POST',
      body: payload,
    }),

  updateLicenseStatus: (id, status) =>
    request(`/licenses/${id}`, {
      method: 'PATCH',
      body: { status },
    }),

  verifyLicense: (licenseNumber) =>
    request(`/licenses/verify/${encodeURIComponent(licenseNumber)}`),

  // ---------------- ASSIGNMENTS ----------------
  getAssignments: () => request('/assignments'),

  getMyAssignments: () => request('/assignments/my'),

  createAssignment: (payload) =>
    request('/assignments', {
      method: 'POST',
      body: payload,
    }),

  assignDriver: (payload) =>
    request('/assignments', {
      method: 'POST',
      body: payload,
    }),

  assignDriverToVehicle: (payload) =>
    request('/assignments', {
      method: 'POST',
      body: payload,
    }),

  searchAssignmentDriver: (query) =>
    request('/assignments/drivers/search', {
      params: { q: query },
    }),

  createAssignmentInvitation: (payload) =>
    request('/assignments/invitations', {
      method: 'POST',
      body: payload,
    }),

  getMyAssignmentRequests: () => request('/assignments/requests/my'),

  respondToAssignmentRequest: (assignmentId, payload) =>
    request(`/assignments/${assignmentId}/respond`, {
      method: 'PATCH',
      body: payload,
    }),

  removeAssignment: (id, reason = '') =>
    request(`/assignments/${id}/remove`, {
      method: 'PATCH',
      body: { reason },
    }),

  checkAssignment: (registrationNumber, licenseNumber) =>
    request(
      `/assignments/check/${encodeURIComponent(registrationNumber)}/${encodeURIComponent(
        licenseNumber
      )}`
    ),

  // ---------------- VIOLATION TYPE MANAGEMENT ----------------
  getViolationTypes: (params = {}) =>
    request('/violation-types', {
      params,
    }),

  getActiveViolationTypes: (params = {}) =>
    request('/violation-types/active', {
      params,
    }),

  getViolationTypeById: (id) => request(`/violation-types/${id}`),

  createViolationType: (payload) =>
    request('/violation-types', {
      method: 'POST',
      body: payload,
    }),

  updateViolationType: (id, payload) =>
    request(`/violation-types/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  updateViolationTypeStatus: (id, status) =>
    request(`/violation-types/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  deleteViolationType: (id) =>
    request(`/violation-types/${id}`, {
      method: 'DELETE',
    }),

  // ---------------- VIOLATIONS / E-CHALLAN ----------------
  getViolations: () => request('/violations'),

  getMyViolations: () => request('/violations/my'),

  getDriverViolations: () => request('/driver/violations/me'),

  getVehicleViolations: (registrationNumber) =>
    request(`/violations/vehicle/${encodeURIComponent(registrationNumber)}`),

  getViolationById: (id) => request(`/violations/${id}`),

  createViolation: (payload) =>
    request('/violations', {
      method: 'POST',
      body: payload,
    }),

  updateViolationStatus: (id, status, note = '') =>
    request(`/violations/${id}/status`, {
      method: 'PATCH',
      body: normalizeStatusPayload(status, note),
    }),

  reviewViolation: (id, payload) =>
    request(`/violations/${id}/status`, {
      method: 'PATCH',
      body: normalizeStatusPayload(payload),
    }),

  updatePayment: (id, paymentStatus = 'paid') => {
    const status = paymentStatus === 'waived' ? 'dismissed' : paymentStatus;

    return request(`/violations/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  markViolationPaid: (id) =>
    request(`/violations/${id}/status`, {
      method: 'PATCH',
      body: { status: 'paid' },
    }),

  // ---------------- NOTIFICATIONS ----------------
  getMyNotifications: (limit = 20) =>
    request('/automation/notifications/my', {
      params: { limit },
    }),

  markNotificationRead: (id) =>
    request(`/automation/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    request('/automation/notifications/read-all', {
      method: 'PATCH',
    }),

  // ---------------- QR ----------------
  verifyByQR: (qrValue) =>
    request(`/qr/verify/${encodeURIComponent(qrValue)}`, {
      auth: false,
    }),
};

export default api;