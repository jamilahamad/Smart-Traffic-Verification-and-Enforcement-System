const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    actorRole: String,

    action: {
      type: String,
      required: true,
    },

    module: String,
    description: String,

    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,

    ipAddress: String,
    userAgent: String,

    previousHash: String,
    currentHash: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);