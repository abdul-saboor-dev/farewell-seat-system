const { Resend } = require('resend');

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is missing in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const result = await resend.emails.send({
      from: 'Farewell Seat System <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    console.log('📧 Full Resend response:', result);

    // ✅ correct extraction
    const emailId = result?.data?.id;

    if (!emailId) {
      throw new Error(
        result?.error?.message || 'Resend did not return email ID'
      );
    }

    console.log(`📧 Email sent → ${to} | ID: ${emailId}`);

    return result;

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error(`Email failed: ${error.message}`);
  }
};

module.exports = sendEmail;