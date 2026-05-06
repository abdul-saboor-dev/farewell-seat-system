const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route  POST /api/auth/register
// @desc   Register student account (no OTP)
router.post('/register', register);

// @route  POST /api/auth/login
// @desc   Login with device ID binding — returns JWT directly
router.post('/login', login);

// @route  GET /api/auth/me
// @desc   Get logged-in student profile (protected)
router.get('/me', protect, getMe);

module.exports = router;
