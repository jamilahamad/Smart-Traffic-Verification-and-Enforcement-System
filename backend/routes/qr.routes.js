const express = require("express");
const qrController = require("../controllers/qr.controller");

const router = express.Router();

// Public route for QR verification
router.get("/verify/:qrValue", qrController.verifyQR);

module.exports = router;