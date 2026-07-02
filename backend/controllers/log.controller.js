const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const logService = require("../services/log.service");

const getVerificationLogs = asyncHandler(async (req, res) => {
  const logs = await logService.getVerificationLogs({
    user: req.user,
    filters: req.query,
  });

  return sendSuccess(res, 200, "Verification logs fetched successfully.", {
    count: logs.length,
    logs,
  });
});

const getMyVerificationLogs = asyncHandler(async (req, res) => {
  const logs = await logService.getMyVerificationLogs({
    user: req.user,
    filters: req.query,
  });

  return sendSuccess(res, 200, "My verification logs fetched successfully.", {
    count: logs.length,
    logs,
  });
});

const getActivityLogs = asyncHandler(async (req, res) => {
  const activities = await logService.getActivityLogs({
    user: req.user,
    filters: req.query,
  });

  return sendSuccess(res, 200, "Activity logs fetched successfully.", {
    count: activities.length,
    activities,
  });
});

module.exports = {
  getVerificationLogs,
  getMyVerificationLogs,
  getActivityLogs,
};