const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const licenseController = require("../controllers/license.controller");

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "police"),
  licenseController.getLicenses
);

router.get(
  "/my",
  protect,
  authorizeRoles("driver", "admin"),
  licenseController.getMyLicenses
);

router.get(
  "/verify/:licenseNumber",
  protect,
  authorizeRoles("admin", "police", "driver"),
  licenseController.verifyLicense
);

module.exports = router;