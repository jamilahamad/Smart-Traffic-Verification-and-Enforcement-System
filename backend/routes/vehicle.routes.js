const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const vehicleController = require("../controllers/vehicle.controller");

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "police"),
  vehicleController.getVehicles
);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "owner"),
  vehicleController.createVehicle
);

router.get(
  "/my",
  protect,
  authorizeRoles("owner", "admin"),
  vehicleController.getMyVehicles
);

router.get(
  "/verify/:plate",
  protect,
  authorizeRoles("admin", "police", "owner"),
  vehicleController.verifyVehicle
);




router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin"),
  vehicleController.updateVehicleStatus
);

router.patch(
  "/:id",
  protect,
  authorizeRoles("admin", "owner"),
  vehicleController.updateVehicle
);

module.exports = router;