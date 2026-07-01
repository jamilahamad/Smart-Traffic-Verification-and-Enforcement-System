// ============================================================
// Violation (E-Challan) Routes
// Case management and enforcement
// ============================================================

const express = require('express');
const router = express.Router();

// Violation types with fine amounts
const VIOLATION_TYPES = {
  'DL_EXP': { label: 'Expired Driving License', fine: 5000 },
  'REG_EXP': { label: 'Expired Vehicle Registration', fine: 10000 },
  'FIT_EXP': { label: 'Expired Fitness Certificate', fine: 7000 },
  'TAX_EXP': { label: 'Expired Tax Token', fine: 3000 },
  'INS_EXP': { label: 'Expired Insurance', fine: 5000 },
  'NO_DL': { label: 'Driving Without License', fine: 25000 },
  'UNAUTH_DRV': { label: 'Unauthorized Driver', fine: 15000 },
  'ROUTE_EXP': { label: 'Expired Route Permit', fine: 8000 },
  'OVERLOAD': { label: 'Overloading', fine: 10000 },
  'SIGNAL': { label: 'Traffic Signal Violation', fine: 5000 },
  'SPEED': { label: 'Speeding', fine: 5000 },
  'RECKLESS': { label: 'Reckless Driving', fine: 20000 },
  'PARKING': { label: 'Illegal Parking', fine: 2000 },
  'HELMET': { label: 'No Helmet', fine: 1000 },
  'SEATBELT': { label: 'No Seatbelt', fine: 1000 },
  'BLACKLIST': { label: 'Blacklisted Vehicle', fine: 50000 },
};

/**
 * Generate unique case ID
 */
function generateCaseId() {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `EC-${year}-${num}`;
}

/**
 * @route   GET /api/violations
 * @desc    Get all violations (Admin/Police)
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { status, officerId, vehicleId, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (officerId) filter.officerId = officerId;
    if (vehicleId) filter.vehicleId = vehicleId;

    // In production:
    // const violations = await Violation.find(filter)
    //   .sort({ createdAt: -1 })
    //   .skip((page - 1) * limit)
    //   .limit(limit)
    //   .populate('vehicleId driverId officerId');
    // const total = await Violation.countDocuments(filter);

    res.json({
      success: true,
      count: 0,
      total: 0,
      page: parseInt(page),
      pages: 0,
      violations: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/violations/my
 * @desc    Get current user's violations
 * @access  Private
 */
router.get('/my', async (req, res) => {
  try {
    // In production:
    // const violations = await Violation.find({
    //   $or: [{ driverId: req.userId }, { officerId: req.userId }]
    // }).sort({ createdAt: -1 });

    res.json({
      success: true,
      violations: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/violations/types
 * @desc    Get all violation types with fines
 * @access  Public
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    violationTypes: Object.entries(VIOLATION_TYPES).map(([code, data]) => ({
      code,
      ...data,
    })),
  });
});

/**
 * @route   GET /api/violations/:id
 * @desc    Get violation by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    // In production:
    // const violation = await Violation.findById(req.params.id)
    //   .populate('vehicleId driverId officerId');

    res.json({
      success: true,
      violation: null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   POST /api/violations
 * @desc    Create new violation (E-Challan)
 * @access  Private (Police)
 */
router.post('/', async (req, res) => {
  try {
    const {
      vehicleId, driverId, plateNumber, driverName,
      violationType, description, location,
    } = req.body;

    // Validation
    if (!vehicleId || !plateNumber || !violationType || !location) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, violation type, and location are required.',
      });
    }

    // Validate violation type
    if (!VIOLATION_TYPES[violationType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid violation type.',
      });
    }

    const violationData = VIOLATION_TYPES[violationType];
    const caseId = generateCaseId();

    // In production:
    // const violation = await Violation.create({
    //   caseId,
    //   vehicleId,
    //   driverId,
    //   officerId: req.userId,
    //   plateNumber,
    //   driverName,
    //   officerName: req.userName,
    //   violationType,
    //   description: description || violationData.label,
    //   fineAmount: violationData.fine,
    //   status: 'pending',
    //   location,
    // });

    // Decrease vehicle safety score
    // await Vehicle.findByIdAndUpdate(vehicleId, { $inc: { safetyScore: -10 } });

    res.status(201).json({
      success: true,
      message: 'E-Challan created successfully.',
      caseId,
      fineAmount: violationData.fine,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   PUT /api/violations/:id/status
 * @desc    Update violation status (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'dismissed', 'paid'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.',
      });
    }

    // In production:
    // const violation = await Violation.findByIdAndUpdate(
    //   req.params.id,
    //   { status, updatedAt: new Date() },
    //   { new: true }
    // );

    res.json({
      success: true,
      message: `Violation status updated to ${status}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/violations/stats/summary
 * @desc    Get violation statistics
 * @access  Private (Admin/Police)
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // In production:
    // const stats = await Violation.aggregate([
    //   { $group: {
    //     _id: '$status',
    //     count: { $sum: 1 },
    //     totalFines: { $sum: '$fineAmount' },
    //   }},
    // ]);

    res.json({
      success: true,
      stats: {
        total: 0,
        pending: 0,
        approved: 0,
        dismissed: 0,
        paid: 0,
        totalFines: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
