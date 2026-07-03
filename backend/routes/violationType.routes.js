const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const violationTypeController = require("../controllers/violationType.controller");

const router = express.Router();

router.get(
  "/active",
  protect,
  authorizeRoles("admin", "police"),
  violationTypeController.getActiveViolationTypes
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "police"),
  violationTypeController.getViolationTypes
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  violationTypeController.getViolationTypeById
);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  violationTypeController.createViolationType
);

router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin"),
  violationTypeController.updateViolationTypeStatus
);

router.patch(
  "/:id",
  protect,
  authorizeRoles("admin"),
  violationTypeController.updateViolationType
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  violationTypeController.deleteViolationType
);

module.exports = router;