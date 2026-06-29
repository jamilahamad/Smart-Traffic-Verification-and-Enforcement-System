const mongoose = require('mongoose');

const driverAssignmentSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assignedFrom: {
      type: Date,
      default: Date.now,
    },

    assignedTo: Date,

    status: {
      type: String,
      enum: ['active', 'removed', 'expired'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverAssignment', driverAssignmentSchema);