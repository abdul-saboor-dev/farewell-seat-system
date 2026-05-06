// utils/testEmail.js — Run with: node utils/testEmail.js
require('dotenv').config();
const sendEmail = require('./sendEmail');

(async () => {
  console.log('Testing Gmail SMTP...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);

  try {
    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: 'Test OTP — Farewell Seat System',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;background:#0f0f1a;color:#e0e0e0;">
          <h2 style="color:#a78bfa;margin-bottom:8px;">Test Email ✅</h2>
          <p style="margin-bottom:24px;">Gmail SMTP is configured correctly. Your OTP system is ready.</p>
          <div style="background:#1e1b4b;border-radius:8px;padding:20px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:bold;color:#a78bfa;">
            1 2 3 4 5 6
          </div>
          <p style="margin-top:24px;color:#9ca3af;font-size:13px;">This OTP expires in 5 minutes.</p>
        </div>
      `,
    });
    console.log('SUCCESS — email delivered to', process.env.EMAIL_USER);
  } catch (err) {
    console.error('FAILED —', err.message);
    process.exit(1);
  }
})();
