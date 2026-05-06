const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const OTP = require('../models/OTP');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');

// ─── Helper: Generate JWT Token ───────────────────────────────────────────────
const generateToken = (studentId) => {
  return jwt.sign({ id: studentId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─── Helper: Build OTP Email HTML ─────────────────────────────────────────────
const buildOTPEmailHTML = (name, otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 12px; background: #0f0f1a; color: #e0e0e0;">
    <h2 style="color: #a78bfa; margin-bottom: 8px;">🎓 Farewell Seat Reservation</h2>
    <p style="margin-bottom: 24px;">Hi <strong>${name}</strong>, here is your One-Time Password:</p>
    <div style="background: #1e1b4b; border-radius: 8px; padding: 20px; text-align: center; letter-spacing: 12px; font-size: 36px; font-weight: bold; color: #a78bfa;">
      ${otp}
    </div>
    <p style="margin-top: 24px; color: #9ca3af; font-size: 13px;">This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
    <hr style="border-color: #2d2b5a; margin: 24px 0;" />
    <p style="font-size: 12px; color: #6b7280;">If you did not request this, please ignore this email.</p>
  </div>
`;

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, rollNumber } = req.body;

    if (!name || !email || !rollNumber) {
      const err = new Error('Name, email, and roll number are required');
      err.statusCode = 400;
      return next(err);
    }

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

    const rawOTP = generateOTP();
    const hashedOTP = await bcrypt.hash(rawOTP, 10);

    await OTP.deleteMany({ email: email.toLowerCase() });

    await OTP.create({
      email: email.toLowerCase(),
      otp: hashedOTP,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // ✅ FIXED: NON-BLOCKING EMAIL (IMPORTANT)
    sendEmail({
      to: email,
      subject: '🎓 Your Farewell Seat OTP Code',
      html: buildOTPEmailHTML(student.name, rawOTP),
    }).catch(err => {
      console.log('⚠️ Email failed but OTP still valid:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${email}. It expires in 5 minutes.`,
    });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OTP
// ─────────────────────────────────────────────────────────────────────────────
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      const err = new Error('Email and OTP are required');
      err.statusCode = 400;
      return next(err);
    }

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      const err = new Error('OTP has expired or does not exist. Please request a new one.');
      err.statusCode = 400;
      return next(err);
    }

    const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otp);

    if (!isMatch) {
      const err = new Error('Invalid OTP. Please try again.');
      err.statusCode = 401;
      return next(err);
    }

    const student = await Student.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isVerified: true },
      { returnDocument: 'after' }
    );

    if (!student) {
      const err = new Error('Student not found. Please register first.');
      err.statusCode = 404;
      return next(err);
    }

    await OTP.deleteMany({ email: email.toLowerCase() });

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
// RESEND OTP
// ─────────────────────────────────────────────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      const err = new Error('Email is required');
      err.statusCode = 400;
      return next(err);
    }

    const student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      const err = new Error('No student found with this email. Please register first.');
      err.statusCode = 404;
      return next(err);
    }

    const rawOTP = generateOTP();
    const hashedOTP = await bcrypt.hash(rawOTP, 10);

    await OTP.deleteMany({ email: email.toLowerCase() });

    await OTP.create({
      email: email.toLowerCase(),
      otp: hashedOTP,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // ✅ FIXED: NON-BLOCKING EMAIL
    sendEmail({
      to: email,
      subject: '🎓 Your New Farewell Seat OTP Code',
      html: buildOTPEmailHTML(student.name, rawOTP),
    }).catch(err => {
      console.log('⚠️ Resend email failed but OTP still valid:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: `New OTP sent to ${email}. It expires in 5 minutes.`,
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

module.exports = { register, verifyOTP, resendOTP, getMe };