/**
 * OTP Generator Utility
 * Generates a cryptographically random 6-digit OTP.
 * Will be used in Phase 2 (Auth System).
 */
const crypto = require('crypto');

const generateOTP = () => {
  // Generate a random 6-digit number (100000 – 999999)
  return crypto.randomInt(100000, 999999).toString();
};

module.exports = generateOTP;
