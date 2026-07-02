const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const analyticsService = require("../services/analytics.service");
const logService = require("../services/log.service");

const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getAnalyticsSummary();

  return sendSuccess(res, 200, "Analytics fetched successfully.", {
    analytics,

     ...analytics,
  });
});

const getAnalyticsLogs = asyncHandler(async (req, res) => {
  const activities = await logService.getActivityLogs({
    user: req.user,
    filters: req.query,
  });

  return sendSuccess(res, 200, "Analytics activity logs fetched successfully.", {
    count: activities.length,
    logs: activities,
  });
});

module.exports = {
  getAnalytics,
  getAnalyticsLogs,
};