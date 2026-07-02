const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const licenseExpiryAutomationService = require("../services/licenseExpiryAutomation.service");

const runLicenseExpiryAutomation = asyncHandler(async (req, res) => {
  const summary = await licenseExpiryAutomationService.runLicenseExpiryAutomation();

  return sendSuccess(res, 200, "License expiry automation completed.", {
    summary,
  });
});

const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await licenseExpiryAutomationService.getMyNotifications(
    req.user,
    req.query
  );

  return sendSuccess(res, 200, "Notifications fetched successfully.", {
    count: notifications.length,
    notifications,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await licenseExpiryAutomationService.markNotificationRead(
    req.user,
    req.params.id
  );

  return sendSuccess(res, 200, "Notification marked as read.", {
    notification,
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await licenseExpiryAutomationService.markAllNotificationsRead(
    req.user
  );

  return sendSuccess(res, 200, "All notifications marked as read.", result);
});

module.exports = {
  runLicenseExpiryAutomation,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};