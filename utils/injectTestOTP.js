require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const OTP = require('./models/OTP');

// Re-inject a fresh OTP for test student
const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hash = await bcrypt.hash('123456', 10);
  await OTP.deleteMany({ email: 'ali@test.com' });
  await OTP.create({
    email: 'ali@test.com',
    otp: hash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  console.log('OTP_READY');
  await mongoose.disconnect();
};
run();
