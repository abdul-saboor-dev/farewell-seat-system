const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await resend.emails.send({
      from: 'Farewell Seat System <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    console.log('📧 Email sent:', response.id);
    return response;

  } catch (error) {
    console.error('❌ Email failed:', error.message);
    throw new Error(`Email failed: ${error.message}`);
  }
};

module.exports = sendEmail;