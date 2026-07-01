// ============================================================
// User Management Routes (Admin)
// ============================================================

const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    // In production:
    // let query = User.find(filter).select('-password');
    // if (search) {
    //   query = query.or([
    //     { name: { $regex: search, $options: 'i' } },
    //     { email: { $regex: search, $options: 'i' } },
    //     { nid: { $regex: search, $options: 'i' } },
    //   ]);
    // }
    // const users = await query.skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
    // const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: 0,
      total: 0,
      page: parseInt(page),
      pages: 0,
      users: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get('/:id', async (req, res) => {
  try {
    // In production:
    // const user = await User.findById(req.params.id).select('-password');

    res.json({
      success: true,
      user: null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user details (Admin)
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, role, badge, station } = req.body;

    // Don't allow changing email or password through this route
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (badge) updateData.badge = badge;
    if (station) updateData.station = station;

    // In production:
    // const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.json({
      success: true,
      message: 'User updated successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (Admin)
 * @access  Private (Admin)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'suspended', 'blacklisted'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.',
      });
    }

    // Prevent admins from being suspended
    // In production:
    // const user = await User.findById(req.params.id);
    // if (user.role === 'admin') {
    //   return res.status(403).json({ success: false, message: 'Cannot modify admin status.' });
    // }
    // user.status = status;
    // await user.save();

    res.json({
      success: true,
      message: `User status updated to ${status}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin)
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    // In production:
    // const user = await User.findById(req.params.id);
    // if (user.role === 'admin') {
    //   return res.status(403).json({ success: false, message: 'Cannot delete admin accounts.' });
    // }
    // await user.remove();

    res.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/users/stats/summary
 * @desc    Get user statistics
 * @access  Private (Admin)
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // In production:
    // const stats = await User.aggregate([
    //   { $group: { _id: '$role', count: { $sum: 1 } } },
    // ]);

    res.json({
      success: true,
      stats: {
        total: 0,
        byRole: {
          admin: 0,
          police: 0,
          driver: 0,
          owner: 0,
        },
        byStatus: {
          active: 0,
          suspended: 0,
          blacklisted: 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
