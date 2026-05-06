const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true, // stored as bcrypt hash
  },
  expiresAt: {
    type: Date,
    required: true,
    // TTL index: MongoDB auto-deletes document when expiresAt is reached
    index: { expires: 0 },
  },
});

// Ensure only one OTP exists per email at a time
otpSchema.index({ email: 1 });

module.exports = mongoose.model('OTP', otpSchema);
