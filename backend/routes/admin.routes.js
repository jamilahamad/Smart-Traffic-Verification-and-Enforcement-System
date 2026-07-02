const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const adminController = require("../controllers/admin.controller");
const upload = require("../middlewares/uploadMiddleware");
const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/dashboard", adminController.getDashboard);

router.post(
  "/brta/drivers/:brtaDriverId/photo",
  upload.single("photo"),
  adminController.uploadBrtaDriverPhoto
);

router.post(
  "/brta/owners/:brtaOwnerId/photo",
  upload.single("photo"),
  adminController.uploadBrtaOwnerPhoto
);

router.get("/users", adminController.getUsers);
router.post("/users", adminController.createUser);
router.patch("/users/:id", adminController.updateUser);

router.get("/vehicles", adminController.getVehicles);
router.get("/licenses", adminController.getLicenses);
router.get("/cases", adminController.getCases);
router.get("/assignments", adminController.getAssignments);

module.exports = router;