const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const automationController = require("../controllers/automation.controller");

const router = express.Router();

router.post(
  "/license-expiry/run",
  protect,
  authorizeRoles("admin"),
  automationController.runLicenseExpiryAutomation
);

router.get(
  "/notifications/my",
  protect,
  authorizeRoles("admin", "police", "driver", "owner"),
  automationController.getMyNotifications
);

router.patch(
  "/notifications/read-all",
  protect,
  authorizeRoles("admin", "police", "driver", "owner"),
  automationController.markAllNotificationsRead
);

router.patch(
  "/notifications/:id/read",
  protect,
  authorizeRoles("admin", "police", "driver", "owner"),
  automationController.markNotificationRead
);

module.exports = router;