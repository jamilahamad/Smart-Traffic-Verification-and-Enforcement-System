const express = require("express");

const authController = require("../controllers/auth.controller");
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/register/request-otp", authController.requestRegistrationOtp);
router.post("/register/verify-otp", authController.verifyRegistrationOtp);
router.post("/password/request-otp", authController.requestPasswordResetOtp);
router.post("/password/reset", authController.resetPasswordWithOtp);
router.post("/login", authController.login);
router.get("/me", protect, authController.me);
router.patch("/me", protect, authController.updateMe);
router.patch("/me/password", protect, authController.changePassword);

module.exports = router;
