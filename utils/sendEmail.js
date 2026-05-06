const nodemailer = require('nodemailer');

/**
 * Email Sender Utility — Gmail SMTP via Nodemailer
 * Always sends real emails. No stub/fallback mode.
 *
 * Required .env variables:
 *   EMAIL_USER=cit.farewell@gmail.com
 *   EMAIL_PASS=<16-char Gmail App Password>
 */

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // avoid cert issues in some environments
    },
  });
};

/**
 * Send an email using Gmail SMTP.
 * @param {Object} options
 * @param {string} options.to      - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html    - HTML body content
 */
const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Farewell Seat System 🎓" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to} | MessageId: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Email sending failed: ${error.message}`);
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
};

module.exports = sendEmail;
