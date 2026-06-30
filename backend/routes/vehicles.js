// ============================================================
// Vehicle Routes
// CRUD operations for vehicle management
// ============================================================

const express = require('express');
const router = express.Router();

// In production: const Vehicle = require('../models/Vehicle');

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles (Admin only)
 * @access  Private (Admin)
 */
router.get('/', async (req, res) => {
  try {
    // In production:
    // const vehicles = await Vehicle.find().populate('ownerId', 'name email phone');

    res.json({
      success: true,
      count: 0,
      vehicles: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/vehicles/my
 * @desc    Get current user's vehicles
 * @access  Private (Owner)
 */
router.get('/my', async (req, res) => {
  try {
    // In production:
    // const vehicles = await Vehicle.find({ ownerId: req.userId });

    res.json({
      success: true,
      count: 0,
      vehicles: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    // In production:
    // const vehicle = await Vehicle.findById(req.params.id).populate('ownerId assignedDrivers');
    // if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    res.json({
      success: true,
      vehicle: null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   POST /api/vehicles
 * @desc    Register a new vehicle
 * @access  Private (Owner)
 */
router.post('/', async (req, res) => {
  try {
    const {
      plateNumber, vehicleType, brand, model, year, color,
      engineNumber, chassisNumber, registrationDate, registrationExpiry,
      fitnessExpiry, taxTokenExpiry, routePermitExpiry, insuranceExpiry,
    } = req.body;

    // Validation
    if (!plateNumber || !brand || !model || !engineNumber || !chassisNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.',
      });
    }

    // Plate number format validation
    const plateRegex = /^[A-Z]{2,4}-[A-Z]{1,3}-\d{2}-\d{4}$/i;
    if (!plateRegex.test(plateNumber.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plate number format. Use format: DHA-KA-12-3456',
      });
    }

    // In production:
    // const existingVehicle = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
    // if (existingVehicle) {
    //   return res.status(409).json({ success: false, message: 'Vehicle already registered.' });
    // }
    // const vehicle = await Vehicle.create({
    //   ...req.body,
    //   ownerId: req.userId,
    //   qrCode: `VEH-${Date.now()}`,
    //   safetyScore: 100,
    // });

    res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully.',
      vehicle: {
        plateNumber,
        qrCode: `VEH-${Date.now()}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update vehicle details
 * @access  Private (Owner)
 */
router.put('/:id', async (req, res) => {
  try {
    // In production:
    // const vehicle = await Vehicle.findById(req.params.id);
    // if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    // if (vehicle.ownerId.toString() !== req.userId) {
    //   return res.status(403).json({ success: false, message: 'Not authorized.' });
    // }
    // const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });

    res.json({
      success: true,
      message: 'Vehicle updated successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   PUT /api/vehicles/:id/status
 * @desc    Update vehicle status (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'suspended', 'blacklisted'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, suspended, or blacklisted.',
      });
    }

    // In production:
    // const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { status }, { new: true });

    res.json({
      success: true,
      message: `Vehicle status updated to ${status}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   POST /api/vehicles/:id/assign-driver
 * @desc    Assign a driver to vehicle
 * @access  Private (Owner)
 */
router.post('/:id/assign-driver', async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required.',
      });
    }

    // In production:
    // const vehicle = await Vehicle.findById(req.params.id);
    // if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    // if (vehicle.assignedDrivers.includes(driverId)) {
    //   return res.status(400).json({ success: false, message: 'Driver already assigned.' });
    // }
    // vehicle.assignedDrivers.push(driverId);
    // await vehicle.save();

    res.json({
      success: true,
      message: 'Driver assigned successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/**
 * @route   DELETE /api/vehicles/:id/remove-driver/:driverId
 * @desc    Remove a driver from vehicle
 * @access  Private (Owner)
 */
router.delete('/:id/remove-driver/:driverId', async (req, res) => {
  try {
    // In production:
    // const vehicle = await Vehicle.findById(req.params.id);
    // vehicle.assignedDrivers = vehicle.assignedDrivers.filter(d => d.toString() !== req.params.driverId);
    // await vehicle.save();

    res.json({
      success: true,
      message: 'Driver removed successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
