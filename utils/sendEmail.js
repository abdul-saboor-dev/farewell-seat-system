const { Resend } = require('resend');

/**
 * ─────────────────────────────────────────────
 * RESEND EMAIL UTILITY (PRODUCTION SAFE)
 * Fixes:
 * - silent success issue
 * - missing API key crash
 * - weak error logging
 * - fake OTP success responses
 * ─────────────────────────────────────────────
 */

// ❗ HARD FAIL if key missing (important for Railway debugging)
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is missing in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email via Resend
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const result = await resend.emails.send({
      from: 'Farewell Seat System <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    // 🔍 FULL DEBUG (important for production tracing)
    console.log('📧 Resend Response:', JSON.stringify(result, null, 2));

    // ❗ If Resend returns no id → treat as failure
    if (!result || !result.id) {
      throw new Error('Resend did not return a valid email ID');
    }

    console.log(`📧 Email sent successfully → ${to} | ID: ${result.id}`);

    return result;

  } catch (error) {
    console.error('❌ Email sending failed:', error);

    // IMPORTANT: ensures OTP flow stops properly
    throw new Error(`Email failed: ${error.message}`);
  }
};

module.exports = sendEmail;