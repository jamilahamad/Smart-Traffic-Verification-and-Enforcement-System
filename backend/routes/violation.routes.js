const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const violationController = require("../controllers/violation.controller");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "police"),
  violationController.createViolation
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "police"),
  violationController.getViolations
);

router.get(
  "/my",
  protect,
  authorizeRoles("admin", "police", "driver", "owner"),
  violationController.getMyViolations
);

router.get(
  "/driver/my",
  protect,
  authorizeRoles("driver"),
  violationController.getMyViolations
);

router.get(
  "/owner/my",
  protect,
  authorizeRoles("owner"),
  violationController.getMyViolations
);

router.get(
  "/vehicle/:registrationNumber",
  protect,
  authorizeRoles("admin", "police", "owner"),
  violationController.getVehicleViolations
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "police", "driver", "owner"),
  violationController.getViolationById
);

router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin", "driver", "owner"),
  violationController.updateViolationStatus
);

router.patch(
  "/:id",
  protect,
  authorizeRoles("admin", "driver", "owner"),
  violationController.updateViolationStatus
);

module.exports = router;