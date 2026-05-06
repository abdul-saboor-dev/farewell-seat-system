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
// LOGIN  (handles device auto-login, incognito login, and new registration)
//
// Full Decision Tree:
//
//  1. x-device-id found in DB
//       → Auto-login immediately (normal browser, returning user)
//
//  2. x-device-id NOT in DB + body has email + rollNumber
//       a. email+rollNumber matches existing account
//            → INCOGNITO/NEW BROWSER BLOCKED: return 403 error
//       b. email+rollNumber is new (both fields are fresh)
//            → Need name to register → if name missing, return { newDevice: true }
//            → if name present → create account + bind deviceId + return JWT
//
//  3. x-device-id NOT in DB + body empty/incomplete
//       → return { newDevice: true } — frontend shows the form
//
// No OTP. No email. No external service.
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const deviceId = (req.headers['x-device-id'] || '').trim();

    if (!deviceId) {
      const err = new Error('Device ID is missing. Please refresh and try again.');
      err.statusCode = 400;
      return next(err);
    }

    // ── STEP 1: Returning device → auto-login immediately ─────────────────────
    const existingByDevice = await Student.findOne({ deviceId });

    if (existingByDevice) {
      console.log(`✅ Auto-login: ${existingByDevice.email} [device: ${deviceId.slice(0, 8)}...]`);
      const token = generateToken(existingByDevice._id);

      return res.status(200).json({
        success: true,
        message: 'Welcome back! Auto-login successful.',
        token,
        student: studentPayload(existingByDevice),
      });
    }

    // ── STEP 2: Unknown device — read form body ────────────────────────────────
    const { name, email, rollNumber } = req.body || {};

    // No credentials at all → tell frontend to show the form
    if (!email && !rollNumber) {
      return res.status(200).json({
        success: true,
        newDevice: true,
        message: 'New device detected. Please enter your details.',
      });
    }

    // ── STEP 2a: Email + Roll provided → check for existing account ───────────
    // This is the INCOGNITO path: same student, different device session.
    // We verify identity by matching BOTH email AND roll number.
    if (email && rollNumber) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        const err = new Error('Please enter a valid email address.');
        err.statusCode = 400;
        return next(err);
      }

      const existingByCredentials = await Student.findOne({
        email: email.toLowerCase().trim(),
        rollNumber: rollNumber.toUpperCase().trim(),
      });

      if (existingByCredentials) {
        // ❌ Credentials match but device is different → block incognito / new browser
        console.log(`🚫 Blocked incognito login attempt: ${existingByCredentials.email}`);
        const err = new Error(
          'Security Alert: You are trying to login from incognito mode or a new browser. ' +
          'Please leave incognito mode and use the original browser you registered with.'
        );
        err.statusCode = 403;
        return next(err);
      }

      // Credentials don't match any account — could be a new student.
      // Fall through to registration logic below.
    }

    // ── STEP 2b: Brand-new student — need all 3 fields to register ────────────
    if (!name || !email || !rollNumber) {
      // Partial data — ask frontend to show the full form
      return res.status(200).json({
        success: true,
        newDevice: true,
        message: 'New device detected. Please complete your registration.',
      });
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      const err = new Error('Please enter a valid email address.');
      err.statusCode = 400;
      return next(err);
    }

    // Guard: email already taken by a DIFFERENT roll number (shouldn't happen, but protect it)
    const emailConflict = await Student.findOne({ email: email.toLowerCase() });
    if (emailConflict) {
      const err = new Error(
        'This email is registered with different details. ' +
        'Check your roll number, or contact admin.'
      );
      err.statusCode = 409;
      return next(err);
    }

    // Guard: roll number already taken
    const rollConflict = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    if (rollConflict) {
      const err = new Error(
        'This roll number is already registered with a different email. Contact admin.'
      );
      err.statusCode = 409;
      return next(err);
    }

    // ── CREATE ACCOUNT + BIND DEVICE ─────────────────────────────────────────
    const student = await Student.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      rollNumber: rollNumber.toUpperCase().trim(),
      deviceId,          // permanently bound to this device session
      isVerified: true,
    });

    console.log(`🆕 New account: ${student.email} [device: ${deviceId.slice(0, 8)}...]`);
    const token = generateToken(student._id);

    return res.status(201).json({
      success: true,
      message: 'Account created! Welcome to the Farewell Seat System.',
      token,
      student: studentPayload(student),
    });

  } catch (error) {
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