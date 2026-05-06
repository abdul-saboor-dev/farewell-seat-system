const nodemailer = require('nodemailer');

/**
 * ─────────────────────────────────────────────
 * EMAIL UTILITY (PRODUCTION SAFE VERSION)
 * Fixes:
 * - Railway SMTP timeout
 * - OTP stuck on "sending..."
 * - unstable transporter creation
 * ─────────────────────────────────────────────
 */

let transporter = null;

// Create & cache transporter (IMPORTANT for performance + stability)
const getTransporter = async () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },

    // 🔥 critical for Railway / Render / Vercel backends
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,
    socketTimeout: 15000,

    tls: {
      rejectUnauthorized: false,
    },
  });

  // Verify connection ONCE (helps catch config issues early)
  try {
    await transporter.verify();
    console.log('📧 Gmail SMTP connected successfully');
  } catch (err) {
    console.error('❌ SMTP verify failed:', err.message);
  }

  return transporter;
};

/**
 * Send Email
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: `"Farewell Seat System 🎓" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 Email sent → ${to} | ID: ${info.messageId}`);
    return info;

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);

    // IMPORTANT: throw clean error so frontend stops spinner properly
    throw new Error(`Email failed: ${error.message}`);
  }
};

module.exports = sendEmail;
console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS ? "PASS OK" : "NO PASS");