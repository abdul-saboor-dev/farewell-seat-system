const express = require('express');
const router = express.Router();
const { register, verifyOTP, resendOTP, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route  POST /api/auth/register
// @desc   Register student & send OTP email
router.post('/register', register);

// @route  POST /api/auth/verify-otp
// @desc   Verify OTP and return JWT token
router.post('/verify-otp', verifyOTP);

// @route  POST /api/auth/resend-otp
// @desc   Resend OTP to student email
router.post('/resend-otp', resendOTP);

// @route  GET /api/auth/me
// @desc   Get logged-in student profile (protected)
router.get('/me', protect, getMe);

module.exports = router;
