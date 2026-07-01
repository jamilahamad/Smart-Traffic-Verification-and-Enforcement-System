const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const licenseRenewalController = require("../controllers/licenseRenewal.controller");

const router = express.Router();

router.post(
  "/submit",
  protect,
  authorizeRoles("driver"),
  licenseRenewalController.submitRenewalProof
);

router.get(
  "/my",
  protect,
  authorizeRoles("driver"),
  licenseRenewalController.getMyRenewalRequests
);

router.get(
  "/pending",
  protect,
  authorizeRoles("admin"),
  licenseRenewalController.getPendingRenewalRequests
);

router.patch(
  "/:id/review",
  protect,
  authorizeRoles("admin"),
  licenseRenewalController.reviewRenewalRequest
);

module.exports = router;