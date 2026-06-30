const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const assignmentController = require("../controllers/assignment.controller");

const router = express.Router();

router.get(
  "/drivers/search",
  protect,
  authorizeRoles("admin", "owner"),
  assignmentController.searchDriverForAssignment
);

router.get(
  "/requests/my",
  protect,
  authorizeRoles("driver"),
  assignmentController.getMyAssignmentRequests
);

router.patch(
  "/:id/respond",
  protect,
  authorizeRoles("driver"),
  assignmentController.respondToAssignmentRequest
);

router.post(
  "/invitations",
  protect,
  authorizeRoles("owner", "admin"),
  assignmentController.createAssignmentInvitation
);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "owner"),
  assignmentController.createAssignment
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "owner", "police"),
  assignmentController.getAssignments
);

router.get(
  "/my",
  protect,
  authorizeRoles("admin", "owner", "driver"),
  assignmentController.getMyAssignments
);

router.get(
  "/check/:registrationNumber/:licenseNumber",
  protect,
  authorizeRoles("admin", "owner", "police", "driver"),
  assignmentController.checkAssignment
);

router.patch(
  "/:id/remove",
  protect,
  authorizeRoles("admin", "owner"),
  assignmentController.removeAssignment
);

module.exports = router;