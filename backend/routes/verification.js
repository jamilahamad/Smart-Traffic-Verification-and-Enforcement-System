// ============================================================
// Verification Routes (Mock BRTA API)
// Vehicle and driver verification engine
// ============================================================

const express = require('express');
const router = express.Router();

/**
 * Check document expiry
 */
function isExpired(dateString) {
  if (!dateString) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateString < today;
}

/**
 * Check if expiring within 30 days
 */
function isExpiringSoon(dateString) {
  if (!dateString) return false;
  const today = new Date();
  const expiryDate = new Date(dateString);
  const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 30;
}

/**
 * @route   GET /api/verify/vehicle/:plateNumber
 * @desc    Verify vehicle by plate number
 * @access  Private (Police)
 */
router.get('/vehicle/:plateNumber', async (req, res) => {
  try {
    const { plateNumber } = req.params;
    const normalizedPlate = plateNumber.toLowerCase().replace(/\s/g, '');

    // In production:
    // const vehicle = await Vehicle.findOne({
    //   plateNumber: { $regex: new RegExp(normalizedPlate, 'i') }
    // }).populate('ownerId assignedDrivers');

    // Mock: Simulate not found for demo
    const vehicle = null;

    if (!vehicle) {
      return res.status(404).json({
        found: false,
        message: 'Vehicle not found in BRTA database.',
        suggestions: [
          'Check if the plate number is correct',
          'Ensure the format is correct (e.g., DHA-KA-12-3456)',
          'The vehicle may not be registered yet',
        ],
      });
    }

    // Detect issues
    const issues = [];
    const warnings = [];

    if (isExpired(vehicle.registrationExpiry)) {
      issues.push({ code: 'REG_EXP', message: 'Vehicle registration expired', date: vehicle.registrationExpiry });
    } else if (isExpiringSoon(vehicle.registrationExpiry)) {
      warnings.push({ code: 'REG_SOON', message: 'Registration expiring soon', date: vehicle.registrationExpiry });
    }

    if (isExpired(vehicle.fitnessExpiry)) {
      issues.push({ code: 'FIT_EXP', message: 'Fitness certificate expired', date: vehicle.fitnessExpiry });
    }

    if (isExpired(vehicle.taxTokenExpiry)) {
      issues.push({ code: 'TAX_EXP', message: 'Tax token expired', date: vehicle.taxTokenExpiry });
    }

    if (isExpired(vehicle.routePermitExpiry)) {
      issues.push({ code: 'ROUTE_EXP', message: 'Route permit expired', date: vehicle.routePermitExpiry });
    }

    if (isExpired(vehicle.insuranceExpiry)) {
      issues.push({ code: 'INS_EXP', message: 'Insurance expired', date: vehicle.insuranceExpiry });
    }

    if (vehicle.status === 'suspended') {
      issues.push({ code: 'SUSPENDED', message: 'Vehicle is suspended' });
    }

    if (vehicle.status === 'blacklisted') {
      issues.push({ code: 'BLACKLIST', message: 'Vehicle is blacklisted' });
    }

    res.json({
      found: true,
      vehicle: {
        id: vehicle._id,
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        engineNumber: vehicle.engineNumber,
        chassisNumber: vehicle.chassisNumber,
        status: vehicle.status,
        safetyScore: vehicle.safetyScore,
      },
      owner: vehicle.ownerId ? {
        name: vehicle.ownerId.name,
        phone: vehicle.ownerId.phone,
      } : null,
      documents: {
        registrationExpiry: vehicle.registrationExpiry,
        fitnessExpiry: vehicle.fitnessExpiry,
        taxTokenExpiry: vehicle.taxTokenExpiry,
        routePermitExpiry: vehicle.routePermitExpiry,
        insuranceExpiry: vehicle.insuranceExpiry,
      },
      assignedDrivers: vehicle.assignedDrivers || [],
      issues,
      warnings,
      isCompliant: issues.length === 0,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Vehicle verification error:', error);
    res.status(500).json({
      found: false,
      message: 'Verification service error. Please try again.',
    });
  }
});

/**
 * @route   GET /api/verify/driver/:licenseNumber
 * @desc    Verify driver by license number
 * @access  Private (Police)
 */
router.get('/driver/:licenseNumber', async (req, res) => {
  try {
    const { licenseNumber } = req.params;
    const normalizedLicense = licenseNumber.toLowerCase().replace(/\s/g, '');

    // In production:
    // const license = await DrivingLicense.findOne({
    //   licenseNumber: { $regex: new RegExp(normalizedLicense, 'i') }
    // }).populate('driverId');

    const license = null;

    if (!license) {
      return res.status(404).json({
        found: false,
        message: 'License not found in BRTA database.',
        suggestions: [
          'Check if the license number is correct',
          'Ensure the format is correct (e.g., DL-DHK-2020-00451)',
          'The license may not be registered yet',
        ],
      });
    }

    const issues = [];

    if (isExpired(license.expiryDate)) {
      issues.push({ code: 'DL_EXP', message: 'License expired', date: license.expiryDate });
    }

    if (license.status === 'suspended') {
      issues.push({ code: 'DL_SUSP', message: 'License is suspended' });
    }

    if (license.status === 'revoked') {
      issues.push({ code: 'DL_REV', message: 'License has been revoked' });
    }

    res.json({
      found: true,
      license: {
        licenseNumber: license.licenseNumber,
        driverName: license.driverName,
        category: license.category,
        issueDate: license.issueDate,
        expiryDate: license.expiryDate,
        bloodGroup: license.bloodGroup,
        status: license.status,
        nid: license.nid,
        address: license.address,
      },
      driver: license.driverId ? {
        name: license.driverId.name,
        phone: license.driverId.phone,
        status: license.driverId.status,
      } : null,
      issues,
      isCompliant: issues.length === 0 && license.status === 'valid',
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Driver verification error:', error);
    res.status(500).json({
      found: false,
      message: 'Verification service error. Please try again.',
    });
  }
});

/**
 * @route   GET /api/verify/qr/:qrCode
 * @desc    Verify by QR code (Public - limited info)
 * @access  Public
 */
router.get('/qr/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;

    // In production:
    // const vehicle = await Vehicle.findOne({ qrCode });

    const vehicle = null;

    if (!vehicle) {
      return res.status(404).json({
        found: false,
        message: 'Invalid QR Code.',
      });
    }

    // Public endpoint - only return limited information (privacy)
    const issues = [];
    if (isExpired(vehicle.registrationExpiry)) issues.push('Expired registration');
    if (isExpired(vehicle.fitnessExpiry)) issues.push('Expired fitness');
    if (vehicle.status !== 'active') issues.push(`Vehicle ${vehicle.status}`);

    res.json({
      found: true,
      // Limited public info only
      vehicleType: vehicle.vehicleType,
      status: vehicle.status,
      isCompliant: issues.length === 0,
      verifiedAt: new Date().toISOString(),
      // Do NOT expose: plateNumber, owner details, etc.
    });
  } catch (error) {
    res.status(500).json({
      found: false,
      message: 'Verification service error.',
    });
  }
});

/**
 * @route   POST /api/verify/check-authorization
 * @desc    Check if driver is authorized for vehicle
 * @access  Private (Police)
 */
router.post('/check-authorization', async (req, res) => {
  try {
    const { vehicleId, driverId } = req.body;

    if (!vehicleId || !driverId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID and Driver ID are required.',
      });
    }

    // In production:
    // const vehicle = await Vehicle.findById(vehicleId);
    // const isAuthorized = vehicle.assignedDrivers.includes(driverId);

    res.json({
      success: true,
      isAuthorized: false,
      message: 'Driver is not authorized for this vehicle.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
});

module.exports = router;
