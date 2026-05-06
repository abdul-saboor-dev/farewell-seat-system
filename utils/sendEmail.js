const nodemailer = require('nodemailer');

// Create transporter once (better performance)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS (STARTTLS)

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },

  connectionTimeout: 15000,
  socketTimeout: 15000,

  tls: {
    rejectUnauthorized: false,
  },
});

// Optional: verify once at startup
transporter.verify()
  .then(() => console.log('📧 SMTP ready'))
  .catch(err => console.log('❌ SMTP error:', err.message));

/**
 * Send Email
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Farewell Seat System 🎓" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent → ${to} | ID: ${info.messageId}`);
    return info;

  } catch (error) {
    console.error('❌ Email failed:', error.message);
    throw new Error(`Email failed: ${error.message}`);
  }
};

module.exports = sendEmail;