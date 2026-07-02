const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const logController = require("../controllers/log.controller");

const router = express.Router();

router.get(
  "/verification",
  protect,
  authorizeRoles("admin", "police"),
  logController.getVerificationLogs
);

router.get(
  "/activity",
  protect,
  authorizeRoles("admin", "police"),
  logController.getActivityLogs
);

module.exports = router;