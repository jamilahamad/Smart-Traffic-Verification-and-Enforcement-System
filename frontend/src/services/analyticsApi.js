import api from '../lib/api';

const analyticsApi = {
  getAnalytics: api.getAnalytics,
  getAnalyticsStats: api.getAnalyticsStats,
  getActivityLogs: api.getActivityLogs,
  getVerificationLogs: api.getVerificationLogs,
  getMyVerificationLogs: api.getMyVerificationLogs,
};

export default analyticsApi;