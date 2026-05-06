const { Resend } = require('resend');

/**
 * ─────────────────────────────────────────────
 * EMAIL UTILITY (RESEND API VERSION)
 * Fixes:
 * - SMTP timeout issues
 * - ENETUNREACH errors
 * - Railway/Vercel email failures
 * - OTP stuck on "sending..."
 * ─────────────────────────────────────────────
 */

// Create Resend client using API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send Email using Resend API
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing in environment variables');
    }

    const response = await resend.emails.send({
      from: 'Farewell Seat System 🎓 <onboarding@resend.dev>', // default safe sender
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`🆔 Email ID: ${response.id}`);

    return response;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error(`Email failed: ${error.message}`);
  }
};

module.exports = sendEmail;