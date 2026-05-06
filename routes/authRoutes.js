const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route  POST /api/auth/login
// @desc   Device-based auth — auto-login for returning devices,
//         registration + login for new devices. No OTP, no email.
router.post('/login', login);

// @route  GET /api/auth/me
// @desc   Get logged-in student profile (JWT protected)
router.get('/me', protect, getMe);

module.exports = router;
