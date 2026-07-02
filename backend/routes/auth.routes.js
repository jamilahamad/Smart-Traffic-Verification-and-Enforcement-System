const express = require("express");

const authController = require("../controllers/auth.controller");
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", protect, authController.me);
router.patch("/me", protect, authController.updateMe);

module.exports = router;