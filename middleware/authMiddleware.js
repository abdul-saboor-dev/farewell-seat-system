const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

/**
 * Auth Middleware (Student JWT Guard)
 * Verifies the Bearer JWT token from Authorization header.
 * Also validates that the request device ID matches the bound device.
 * Attaches decoded student payload to req.student.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('No token provided. Please login first.');
      err.statusCode = 401;
      return next(err);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Device ID Validation ─────────────────────────────────────────────────
    const deviceId = req.headers['x-device-id'];

    if (!deviceId || deviceId.trim() === '') {
      const err = new Error('Device ID missing. Please login again.');
      err.statusCode = 401;
      return next(err);
    }

    const student = await Student.findById(decoded.id).select('deviceId');

    if (!student) {
      const err = new Error('Student account not found.');
      err.statusCode = 401;
      return next(err);
    }

    if (student.deviceId && student.deviceId !== deviceId.trim()) {
      const err = new Error('Session invalid: device mismatch. Please login again on your registered device.');
      err.statusCode = 403;
      return next(err);
    }

    req.student = decoded; // { id, iat, exp }
    next();

  } catch (error) {
    const err = new Error('Invalid or expired token. Please login again.');
    err.statusCode = 401;
    next(err);
  }
};

module.exports = { protect };
