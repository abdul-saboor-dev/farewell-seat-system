/**
 * End-to-End API Test Script (Phases 2, 3 & 4)
 * Run: node utils/runTests.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');

const BASE = 'http://localhost:5000';
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

// ── HTTP Helper ────────────────────────────────────────────────────────────────
const request = (method, path, body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: 'localhost',
      port: 5000,
      path,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });

const pass = (label, msg) => console.log(`  ✅  [PASS] ${label}: ${msg}`);
const fail = (label, msg) => console.log(`  ❌  [FAIL] ${label}: ${msg}`);
const section = (title) => console.log(`\n${'─'.repeat(55)}\n  ${title}\n${'─'.repeat(55)}`);

// ── Main Test Runner ───────────────────────────────────────────────────────────
(async () => {
  // Inject fresh known OTP for test student
  await mongoose.connect(process.env.MONGO_URI);
  const OTP = require('../models/OTP');
  const hash = await bcrypt.hash('123456', 10);
  await OTP.deleteMany({ email: 'ali@test.com' });
  await OTP.create({
    email: 'ali@test.com',
    otp: hash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  await mongoose.disconnect();

  let token = '';
  let passed = 0;
  let failed = 0;

  // ── Phase 2: Auth ────────────────────────────────────────────────────────────
  section('PHASE 2 — AUTH SYSTEM');

  // [1] Register (existing student — should resend OTP)
  let r = await request('POST', '/api/auth/register', {
    name: 'Ali Khan', email: 'ali@test.com', rollNumber: 'CS-101',
  });
  r.body.success
    ? (pass('Register', r.body.message), passed++)
    : (fail('Register', r.body.message), failed++);

  // [2] Register — missing fields
  r = await request('POST', '/api/auth/register', { name: 'Ali' });
  r.status === 400
    ? (pass('Validation — missing fields', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Validation — missing fields', `Got ${r.status}`), failed++);

  // [3] Re-inject OTP (register just overwrote it)
  await mongoose.connect(process.env.MONGO_URI);
  const hash2 = await bcrypt.hash('123456', 10);
  await OTP.deleteMany({ email: 'ali@test.com' });
  await OTP.create({ email: 'ali@test.com', otp: hash2, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
  await mongoose.disconnect();

  // [4] Verify OTP — wrong code
  r = await request('POST', '/api/auth/verify-otp', { email: 'ali@test.com', otp: '000000' });
  r.status === 401
    ? (pass('Invalid OTP rejected', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Invalid OTP rejected', `Got ${r.status}`), failed++);

  // [5] Verify OTP — correct code → get JWT
  r = await request('POST', '/api/auth/verify-otp', { email: 'ali@test.com', otp: '123456' });
  if (r.body.success && r.body.token) {
    token = r.body.token;
    pass('Verify OTP + JWT', `Verified: ${r.body.student.isVerified} | Token: ${token.slice(0, 25)}...`);
    passed++;
  } else {
    fail('Verify OTP + JWT', r.body.message);
    failed++;
  }

  // [6] GET /api/auth/me — no token
  r = await request('GET', '/api/auth/me');
  r.status === 401
    ? (pass('Protected route — no token', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Protected route — no token', `Got ${r.status}`), failed++);

  // [7] GET /api/auth/me — valid token
  r = await request('GET', '/api/auth/me', null, { Authorization: `Bearer ${token}` });
  r.body.success
    ? (pass('GET /auth/me', `Name: ${r.body.student.name}`), passed++)
    : (fail('GET /auth/me', r.body.message), failed++);

  // ── Phase 3: Seats ───────────────────────────────────────────────────────────
  section('PHASE 3 — SEAT RESERVATION');

  // [8] GET all seats (public)
  r = await request('GET', '/api/seats');
  r.body.success && r.body.summary.total === 38
    ? (pass('GET /seats', `Total: ${r.body.summary.total} | Left: ${r.body.leftSeats.length} | Right: ${r.body.rightSeats.length}`), passed++)
    : (fail('GET /seats', `Got ${r.body.summary?.total} seats`), failed++);

  // [9] Book seat without token
  r = await request('POST', '/api/seats/book', { seatNumber: 5 });
  r.status === 401
    ? (pass('Book seat — no token blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Book seat — no token blocked', `Got ${r.status}`), failed++);

  // [10] Book seat 7
  r = await request('POST', '/api/seats/book', { seatNumber: 7 }, { Authorization: `Bearer ${token}` });
  r.body.success
    ? (pass('Book seat 7', r.body.message), passed++)
    : (fail('Book seat 7', r.body.message), failed++);

  // [11] Double booking blocked
  r = await request('POST', '/api/seats/book', { seatNumber: 5 }, { Authorization: `Bearer ${token}` });
  r.status === 409
    ? (pass('Double booking blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Double booking blocked', `Got ${r.status}`), failed++);

  // [12] Book already-taken seat
  await mongoose.connect(process.env.MONGO_URI);
  const Student = require('../models/Student');
  const s2 = await Student.create({ name: 'Sara', email: 'sara@test.com', rollNumber: 'CS-102', isVerified: true });
  const jwt = require('jsonwebtoken');
  const token2 = jwt.sign({ id: s2._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  await mongoose.disconnect();

  r = await request('POST', '/api/seats/book', { seatNumber: 7 }, { Authorization: `Bearer ${token2}` });
  r.status === 409
    ? (pass('Book taken seat blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Book taken seat blocked', `Got ${r.status}`), failed++);

  // ── Phase 4: Admin ───────────────────────────────────────────────────────────
  section('PHASE 4 — ADMIN PANEL');

  // [13] Admin — wrong password
  r = await request('GET', '/api/admin/bookings', null, { 'X-Admin-Password': 'wrongpass' });
  r.status === 403
    ? (pass('Admin wrong password blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Admin wrong password blocked', `Got ${r.status}`), failed++);

  // [14] Admin — no password
  r = await request('GET', '/api/admin/bookings');
  r.status === 401
    ? (pass('Admin no password blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Admin no password blocked', `Got ${r.status}`), failed++);

  // [15] Admin — view all bookings
  r = await request('GET', '/api/admin/bookings', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin GET /bookings', `Total bookings: ${r.body.totalBookings}`), passed++)
    : (fail('Admin GET /bookings', r.body.message), failed++);

  // [16] Admin — view all students
  r = await request('GET', '/api/admin/students', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin GET /students', `Total students: ${r.body.totalStudents}`), passed++)
    : (fail('Admin GET /students', r.body.message), failed++);

  // [17] Admin — cancel seat 7
  r = await request('DELETE', '/api/admin/booking/7', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin cancel seat 7', r.body.message), passed++)
    : (fail('Admin cancel seat 7', r.body.message), failed++);

  // [18] Confirm seat 7 is free
  r = await request('GET', '/api/seats');
  r.body.summary.booked === 0
    ? (pass('Seat 7 freed after cancel', `Booked: ${r.body.summary.booked} | Available: ${r.body.summary.available}`), passed++)
    : (fail('Seat 7 freed after cancel', `Still booked: ${r.body.summary.booked}`), failed++);

  // [19] Admin — reset all
  r = await request('DELETE', '/api/admin/reset', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin reset all seats', r.body.message), passed++)
    : (fail('Admin reset all seats', r.body.message), failed++);

  // Cleanup test student sara
  await mongoose.connect(process.env.MONGO_URI);
  const Student2 = require('../models/Student');
  await Student2.deleteOne({ email: 'sara@test.com' });
  await mongoose.disconnect();

  // ── Summary ──────────────────────────────────────────────────────────────────
  section(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('  🎉 ALL TESTS PASSED!\n');
  else console.log(`  ⚠️  ${failed} test(s) failed. Check output above.\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
