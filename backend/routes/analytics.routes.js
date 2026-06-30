const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const analyticsController = require("../controllers/analytics.controller");

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  analyticsController.getAnalytics
);

router.get(
  "/logs",
  protect,
  authorizeRoles("admin"),
  analyticsController.getAnalyticsLogs
);

module.exports = router;