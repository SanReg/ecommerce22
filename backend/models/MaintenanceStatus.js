const mongoose = require('mongoose');

const maintenanceStatusSchema = new mongoose.Schema({
  isEnabled: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: 'We are currently performing maintenance. Please check back soon!'
  },
  estimatedEndTime: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one document exists
maintenanceStatusSchema.statics.getInstance = async function() {
  let instance = await this.findOne();
  if (!instance) {
    instance = await this.create({
      isEnabled: false,
      message: 'We are currently performing maintenance. Please check back soon!'
    });
  }
  return instance;
};

module.exports = mongoose.model('MaintenanceStatus', maintenanceStatusSchema);
