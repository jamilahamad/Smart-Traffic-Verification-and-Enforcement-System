// ============================================================
// Authentication Routes
// Handles user registration, login, logout, and profile
// ============================================================

const express = require('express');
const router = express.Router();

// In production, import these:
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, nid } = req.body;

    // Validation
    if (!name || !email || !password || !role || !phone || !nid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.',
        errors: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null,
          role: !role ? 'Role is required' : null,
          phone: !phone ? 'Phone is required' : null,
          nid: !nid ? 'NID is required' : null,
        },
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format.',
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // Phone validation (Bangladesh format)
    if (!/^01\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 11 digits starting with 01.',
      });
    }

    // Role validation
    const validRoles = ['driver', 'owner'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Only driver and owner registrations are allowed.',
      });
    }

    // In production: Check if user exists and create new user
    // const existingUser = await User.findOne({ email });
    // if (existingUser) {
    //   return res.status(409).json({ success: false, message: 'Email already registered.' });
    // }
    // const user = await User.create({ name, email, password, role, phone, nid });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please login.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    // In production:
    // const user = await User.findOne({ email }).select('+password');
    // if (!user || !(await user.comparePassword(password))) {
    //   return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    // }
    // if (user.status !== 'active') {
    //   return res.status(403).json({ success: false, message: `Account is ${user.status}.` });
    // }
    // const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Mock response
    res.json({
      success: true,
      message: 'Login successful.',
      token: 'mock-jwt-token',
      user: {
        id: 'USR-001',
        name: 'Test User',
        email,
        role: 'driver',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    // In production:
    // const user = await User.findById(req.userId);
    // if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({
      success: true,
      user: {
        id: req.userId,
        name: 'Current User',
        role: 'driver',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout', (req, res) => {
  // In production: Add token to blacklist or use Redis for token invalidation
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new passwords.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    // In production:
    // const user = await User.findById(req.userId).select('+password');
    // if (!(await user.comparePassword(currentPassword))) {
    //   return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    // }
    // user.password = newPassword;
    // await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
});

module.exports = router;
