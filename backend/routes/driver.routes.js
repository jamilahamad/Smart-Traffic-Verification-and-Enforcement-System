const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const licenseController = require("../controllers/license.controller");
const violationController = require("../controllers/violation.controller");

const router = express.Router();

router.get(
  "/licenses/me",
  protect,
  authorizeRoles("driver", "admin"),
  licenseController.getMyLicenses
);

router.get(
  "/violations/me",
  protect,
  authorizeRoles("driver", "admin"),
  violationController.getMyViolations
);

module.exports = router;