const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

// ─── Helper: Generate JWT Token ───────────────────────────────────────────────
const generateToken = (studentId) => {
  return jwt.sign({ id: studentId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─── Helper: Safe student payload for response ────────────────────────────────
const studentPayload = (s) => ({
  id: s._id,
  name: s.name,
  email: s.email,
  rollNumber: s.rollNumber,
  isVerified: s.isVerified,
  bookedSeat: s.bookedSeat,
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN  (also handles first-time registration — single unified endpoint)
//
// Flow:
//   1. Read x-device-id header — this IS the identity key
//   2. If device found in DB  →  auto-login (ignore any form body)
//   3. If device NOT found    →  need registration form data
//        a. body missing      →  return { newDevice: true } so frontend shows form
//        b. body present      →  create account, bind device, return JWT
//
// No OTP. No email. No external service. Pure device identity.
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const deviceId = (req.headers['x-device-id'] || '').trim();

    if (!deviceId) {
      const err = new Error('Device ID is missing. Please refresh and try again.');
      err.statusCode = 400;
      return next(err);
    }

    // ── RETURNING DEVICE: auto-login immediately ──────────────────────────────
    const existing = await Student.findOne({ deviceId });

    if (existing) {
      console.log(`✅ Auto-login: ${existing.email} [device: ${deviceId.slice(0, 8)}...]`);
      const token = generateToken(existing._id);

      return res.status(200).json({
        success: true,
        message: 'Welcome back! Auto-login successful.',
        token,
        student: studentPayload(existing),
      });
    }

    // ── NEW DEVICE: check if form data was submitted ──────────────────────────
    const { name, email, rollNumber } = req.body || {};

    if (!name || !email || !rollNumber) {
      // Tell the frontend: "you're a new device, show the registration form"
      return res.status(200).json({
        success: true,
        newDevice: true,
        message: 'New device detected. Please complete your registration.',
      });
    }

    // ── Validate fields before creating ──────────────────────────────────────
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      const err = new Error('Please enter a valid email address.');
      err.statusCode = 400;
      return next(err);
    }

    // Prevent the same email being registered from a second device
    const emailTaken = await Student.findOne({ email: email.toLowerCase() });
    if (emailTaken) {
      const err = new Error(
        'This email is already registered on another device. ' +
        'Each account is permanently locked to one device. ' +
        'Contact admin if you need a device reset.'
      );
      err.statusCode = 409;
      return next(err);
    }

    // Prevent the same roll number being used twice
    const rollTaken = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    if (rollTaken) {
      const err = new Error('This roll number is already registered. Contact admin if this is an error.');
      err.statusCode = 409;
      return next(err);
    }

    // ── CREATE ACCOUNT + BIND DEVICE (first and only time) ───────────────────
    const student = await Student.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      rollNumber: rollNumber.toUpperCase().trim(),
      deviceId,          // bound permanently at creation
      isVerified: true,  // no OTP needed — device IS the verification
    });

    console.log(`🆕 New account created: ${student.email} [device: ${deviceId.slice(0, 8)}...]`);
    const token = generateToken(student._id);

    return res.status(201).json({
      success: true,
      message: 'Account created and login successful!',
      token,
      student: studentPayload(student),
    });

  } catch (error) {
    // Handle Mongoose duplicate key errors gracefully
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      const friendlyErr = new Error(
        field === 'deviceId'
          ? 'This device is already registered. Please refresh the page.'
          : `This ${field} is already in use. Contact admin for help.`
      );
      friendlyErr.statusCode = 409;
      return next(friendlyErr);
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ME — returns logged-in student profile
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const student = await Student.findById(req.student.id).populate('bookedSeat');

    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({ success: true, student });

  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe };