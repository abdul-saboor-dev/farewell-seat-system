const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

// ─── Helper: Generate JWT Token ───────────────────────────────────────────────
const generateToken = (studentId) => {
  return jwt.sign({ id: studentId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// Creates the student account on first visit (no OTP, no email).
// If student already exists, behaves like a login pre-check.
// Device is NOT bound yet at this stage — binding happens on /login.
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, rollNumber } = req.body;

    if (!name || !email || !rollNumber) {
      const err = new Error('Name, email, and roll number are required');
      err.statusCode = 400;
      return next(err);
    }

    // Prevent roll number hijacking across different emails
    const existingRoll = await Student.findOne({
      rollNumber: rollNumber.toUpperCase(),
      email: { $ne: email.toLowerCase() },
    });

    if (existingRoll) {
      const err = new Error('Roll number is already registered with a different email');
      err.statusCode = 409;
      return next(err);
    }

    let student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      student = await Student.create({ name, email, rollNumber });
    }

    return res.status(200).json({
      success: true,
      message: 'Account verified. Proceeding to login...',
    });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// Validates student details + device ID. Binds device on first login.
// Blocks login if a different device is already bound to this account.
// Returns JWT directly — no OTP step.
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { name, email, rollNumber } = req.body;

    // Device ID is sent as a custom header (X-Device-ID)
    const deviceId = req.headers['x-device-id'];

    if (!name || !email || !rollNumber) {
      const err = new Error('Name, email, and roll number are required');
      err.statusCode = 400;
      return next(err);
    }

    if (!deviceId || deviceId.trim() === '') {
      const err = new Error('Device ID is required. Please clear your browser cache and try again.');
      err.statusCode = 400;
      return next(err);
    }

    // Find student by email AND roll number combination
    const student = await Student.findOne({
      email: email.toLowerCase(),
      rollNumber: rollNumber.toUpperCase(),
    });

    if (!student) {
      const err = new Error('No account found with these details. Please check your information.');
      err.statusCode = 404;
      return next(err);
    }

    // ── Device Binding Logic ─────────────────────────────────────────────────
    if (!student.deviceId) {
      // First login — bind this device to the account permanently
      student.deviceId = deviceId.trim();
      student.isVerified = true;
      await student.save();
      console.log(`✅ Device bound for student: ${student.email} → ${deviceId}`);

    } else if (student.deviceId !== deviceId.trim()) {
      // Different device detected — block login
      const err = new Error(
        'This account is already logged in on another device. ' +
        'One account is allowed on one device only. ' +
        'Contact admin if you need to reset your device.'
      );
      err.statusCode = 403;
      return next(err);
    }
    // else: same device — allow login normally

    const token = generateToken(student._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        isVerified: student.isVerified,
        bookedSeat: student.bookedSeat,
      },
    });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const student = await Student.findById(req.student.id).populate('bookedSeat');

    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      success: true,
      student,
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };