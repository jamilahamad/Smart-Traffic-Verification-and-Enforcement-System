const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const logController = require("../controllers/log.controller");

const router = express.Router();

router.get(
  "/my",
  protect,
  authorizeRoles("admin", "police", "driver", "owner"),
  logController.getMyVerificationLogs
);

module.exports = router;