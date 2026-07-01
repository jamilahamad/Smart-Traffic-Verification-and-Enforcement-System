// ============================================================
// Driving License Routes
// License management and verification
// ============================================================

const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/licenses
 * @desc    Get all licenses (Admin only)
 * @access  Private (Admin)
 */
router.get('/', async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    // In production:
    // const licenses = await DrivingLicense.find(filter)
    //   .populate('driverId', 'name email phone')
    //   .sort({ createdAt: -1 })
    //   .skip((page - 1) * limit)
    //   .limit(limit);

    res.json({
      success: true,
      count: 0,
      licenses: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/licenses/my
 * @desc    Get current user's license
 * @access  Private (Driver)
 */
router.get('/my', async (req, res) => {
  try {
    // In production:
    // const license = await DrivingLicense.findOne({ driverId: req.userId });

    res.json({
      success: true,
      license: null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/licenses/:id
 * @desc    Get license by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    // In production:
    // const license = await DrivingLicense.findById(req.params.id).populate('driverId');

    res.json({
      success: true,
      license: null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   POST /api/licenses
 * @desc    Register new driving license
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const {
      licenseNumber, driverId, driverName, category,
      issueDate, expiryDate, bloodGroup, nid, address,
    } = req.body;

    // Validation
    if (!licenseNumber || !driverId || !driverName || !category || !issueDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.',
      });
    }

    // License number format validation
    const licenseRegex = /^DL-[A-Z]{2,4}-\d{4}-\d{5,6}$/i;
    if (!licenseRegex.test(licenseNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid license number format. Use format: DL-DHK-2020-00451',
      });
    }

    // In production:
    // const existingLicense = await DrivingLicense.findOne({ licenseNumber });
    // if (existingLicense) {
    //   return res.status(409).json({ success: false, message: 'License already registered.' });
    // }
    // const license = await DrivingLicense.create({ ... });

    res.status(201).json({
      success: true,
      message: 'License registered successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   PUT /api/licenses/:id
 * @desc    Update license details
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.licenseNumber; // Cannot change license number

    // In production:
    // const license = await DrivingLicense.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.json({
      success: true,
      message: 'License updated successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   PUT /api/licenses/:id/status
 * @desc    Update license status (suspend/revoke/activate)
 * @access  Private (Admin)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['valid', 'suspended', 'revoked'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be valid, suspended, or revoked.',
      });
    }

    // In production:
    // const license = await DrivingLicense.findByIdAndUpdate(
    //   req.params.id,
    //   { status },
    //   { new: true }
    // );

    res.json({
      success: true,
      message: `License status updated to ${status}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/licenses/verify/:licenseNumber
 * @desc    Verify license by number (public limited info)
 * @access  Public
 */
router.get('/verify/:licenseNumber', async (req, res) => {
  try {
    const { licenseNumber } = req.params;

    // In production:
    // const license = await DrivingLicense.findOne({
    //   licenseNumber: { $regex: new RegExp(licenseNumber, 'i') }
    // });

    // Return limited public info
    res.json({
      found: false,
      message: 'License not found.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/licenses/stats/summary
 * @desc    Get license statistics
 * @access  Private (Admin)
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // In production:
    // const stats = await DrivingLicense.aggregate([
    //   { $group: { _id: '$status', count: { $sum: 1 } } },
    // ]);

    res.json({
      success: true,
      stats: {
        total: 0,
        valid: 0,
        expired: 0,
        suspended: 0,
        revoked: 0,
        byCategory: {},
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
