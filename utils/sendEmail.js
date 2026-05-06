const nodemailer = require('nodemailer');

/**
 * ─────────────────────────────────────────────
 * EMAIL UTILITY (RAILWAY SAFE VERSION)
 * Fixes:
 * - SMTP timeout
 * - ENETUNREACH (IPv6 issue)
 * - OTP stuck on "sending..."
 * ─────────────────────────────────────────────
 */

let transporter = null;

// Create & cache transporter
const getTransporter = async () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,          // ✅ FIXED (SSL)
    secure: true,       // ✅ REQUIRED for 465

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },

    // 🔥 FORCE IPv4 (CRITICAL FIX FOR RAILWAY)
    family: 4,

    // Optional but useful timeouts
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    await transporter.verify();
    console.log('📧 SMTP READY (IPv4 + SSL)');
  } catch (err) {
    console.error('❌ SMTP verify failed:', err.message);
  }

  return transporter;
};

// Send Email
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: `"Farewell Seat System 🎓" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent → ${to} | ID: ${info.messageId}`);
    return info;

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error(`Email failed: ${error.message}`);
  }
};

module.exports = sendEmail;

// Debug (remove later)
console.log("EMAIL USER:", process.env.EMAIL_USER);
console.log("EMAIL PASS:", process.env.EMAIL_PASS ? "OK" : "MISSING");