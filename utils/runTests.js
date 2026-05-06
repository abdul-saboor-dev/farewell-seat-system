/**
 * End-to-End API Test Script — Device-Based Auth System
 * Run: node utils/runTests.js
 *
 * Tests the new auth flow:
 *   POST /api/auth/login  (device-first — no OTP, no email)
 *   GET  /api/auth/me     (JWT protected)
 *   POST /api/seats/book  (JWT protected)
 *   Admin routes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

const BASE_HOST = 'localhost';
const BASE_PORT = 5000;
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

// Simulated device IDs for test isolation
const DEVICE_A = 'test-device-aaaa-1111-aaaa-111111111111';
const DEVICE_B = 'test-device-bbbb-2222-bbbb-222222222222';
const DEVICE_C = 'test-device-cccc-3333-cccc-333333333333';

// ── HTTP Helper ────────────────────────────────────────────────────────────────
const request = (method, path, body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: BASE_HOST,
      port: BASE_PORT,
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
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: { message: raw } }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });

const pass = (label, msg) => console.log(`  ✅  [PASS] ${label}: ${msg}`);
const fail = (label, msg) => console.log(`  ❌  [FAIL] ${label}: ${msg}`);
const section = (title) => console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);

// ── Main Test Runner ───────────────────────────────────────────────────────────
(async () => {
  // ── Pre-test cleanup: remove any leftover test students ──────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  const Student = require('../models/Student');
  await Student.deleteMany({ email: { $in: ['ali@test.com', 'sara@test.com'] } });
  await mongoose.disconnect();

  let token = '';
  let passed = 0;
  let failed = 0;

  // ── Phase 2: Auth — Device-Based Login ───────────────────────────────────────
  section('PHASE 2 — AUTH SYSTEM (Device-Based)');

  // [1] New device — no body → should return newDevice: true
  let r = await request('POST', '/api/auth/login', {}, { 'x-device-id': DEVICE_A });
  r.body.success && r.body.newDevice
    ? (pass('New device detected', r.body.message), passed++)
    : (fail('New device detected', JSON.stringify(r.body)), failed++);

  // [2] New device — missing fields → should still return newDevice (body incomplete)
  r = await request('POST', '/api/auth/login', { name: 'Ali' }, { 'x-device-id': DEVICE_A });
  r.body.success && r.body.newDevice
    ? (pass('Incomplete registration fields → newDevice prompt', r.body.message), passed++)
    : (fail('Incomplete registration fields', JSON.stringify(r.body)), failed++);

  // [3] New device — invalid email format
  r = await request('POST', '/api/auth/login',
    { name: 'Ali Khan', email: 'not-an-email', rollNumber: 'CS-101' },
    { 'x-device-id': DEVICE_A }
  );
  r.status === 400
    ? (pass('Invalid email rejected', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Invalid email rejected', `Got ${r.status}: ${r.body.message}`), failed++);

  // [4] New device — full valid data → creates account + returns JWT
  r = await request('POST', '/api/auth/login',
    { name: 'Ali Khan', email: 'ali@test.com', rollNumber: 'CS-101' },
    { 'x-device-id': DEVICE_A }
  );
  if (r.body.success && r.body.token) {
    token = r.body.token;
    pass('New device registration + JWT', `Student: ${r.body.student.name} | Token: ${token.slice(0, 20)}...`);
    passed++;
  } else {
    fail('New device registration + JWT', JSON.stringify(r.body));
    failed++;
  }

  // [5] Same device — auto-login (no body needed)
  r = await request('POST', '/api/auth/login', {}, { 'x-device-id': DEVICE_A });
  r.body.success && r.body.token && !r.body.newDevice
    ? (pass('Returning device auto-login', `Student: ${r.body.student.name}`), passed++)
    : (fail('Returning device auto-login', JSON.stringify(r.body)), failed++);

  // [6] Same device — different name/email in body → still returns SAME account (device wins)
  r = await request('POST', '/api/auth/login',
    { name: 'HACKER', email: 'hacker@evil.com', rollNumber: 'XX-999' },
    { 'x-device-id': DEVICE_A }
  );
  r.body.success && r.body.student?.email === 'ali@test.com'
    ? (pass('Device wins over body data', `Returned original: ${r.body.student.email}`), passed++)
    : (fail('Device wins over body data', JSON.stringify(r.body)), failed++);

  // [7] Different device — same email → blocked (email already taken by DEVICE_A)
  r = await request('POST', '/api/auth/login',
    { name: 'Ali Khan', email: 'ali@test.com', rollNumber: 'CS-101' },
    { 'x-device-id': DEVICE_B }
  );
  r.status === 409
    ? (pass('Same email from different device blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Same email from different device blocked', `Got ${r.status}`), failed++);

  // [8] Missing device ID header → blocked
  r = await request('POST', '/api/auth/login',
    { name: 'Ali Khan', email: 'ali@test.com', rollNumber: 'CS-101' }
  );
  r.status === 400
    ? (pass('Missing device ID blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Missing device ID blocked', `Got ${r.status}`), failed++);

  // [9] GET /api/auth/me — no token
  r = await request('GET', '/api/auth/me', null, { 'x-device-id': DEVICE_A });
  r.status === 401
    ? (pass('Protected route — no token', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Protected route — no token', `Got ${r.status}`), failed++);

  // [10] GET /api/auth/me — valid token
  r = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${token}`,
    'x-device-id': DEVICE_A,
  });
  r.body.success
    ? (pass('GET /auth/me', `Name: ${r.body.student.name}, Roll: ${r.body.student.rollNumber}`), passed++)
    : (fail('GET /auth/me', r.body.message), failed++);

  // ── Phase 3: Seats ───────────────────────────────────────────────────────────
  section('PHASE 3 — SEAT RESERVATION');

  // [11] GET all seats (public — no auth needed)
  r = await request('GET', '/api/seats');
  r.body.success && r.body.summary.total === 38
    ? (pass('GET /seats', `Total: ${r.body.summary.total} | Available: ${r.body.summary.available}`), passed++)
    : (fail('GET /seats', `Got ${r.body.summary?.total} seats`), failed++);

  // [12] Book seat — no token
  r = await request('POST', '/api/seats/book', { seatNumber: 5 }, { 'x-device-id': DEVICE_A });
  r.status === 401
    ? (pass('Book seat — no token blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Book seat — no token blocked', `Got ${r.status}`), failed++);

  // [13] Book seat 7 — valid token + device
  r = await request('POST', '/api/seats/book', { seatNumber: 7 }, {
    Authorization: `Bearer ${token}`,
    'x-device-id': DEVICE_A,
  });
  r.body.success
    ? (pass('Book seat 7', r.body.message), passed++)
    : (fail('Book seat 7', r.body.message), failed++);

  // [14] Double booking blocked
  r = await request('POST', '/api/seats/book', { seatNumber: 5 }, {
    Authorization: `Bearer ${token}`,
    'x-device-id': DEVICE_A,
  });
  r.status === 409
    ? (pass('Double booking blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Double booking blocked', `Got ${r.status}`), failed++);

  // [15] Second student tries to book same seat 7 (already taken)
  await mongoose.connect(process.env.MONGO_URI);
  const sara = await Student.create({
    name: 'Sara', email: 'sara@test.com', rollNumber: 'CS-102',
    deviceId: DEVICE_C, isVerified: true,
  });
  const jwt = require('jsonwebtoken');
  const token2 = jwt.sign({ id: sara._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  await mongoose.disconnect();

  r = await request('POST', '/api/seats/book', { seatNumber: 7 }, {
    Authorization: `Bearer ${token2}`,
    'x-device-id': DEVICE_C,
  });
  r.status === 409
    ? (pass('Book already-taken seat blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Book already-taken seat blocked', `Got ${r.status}`), failed++);

  // ── Phase 4: Admin ───────────────────────────────────────────────────────────
  section('PHASE 4 — ADMIN PANEL');

  // [16] Admin — wrong password
  r = await request('GET', '/api/admin/bookings', null, { 'X-Admin-Password': 'wrongpass' });
  r.status === 403
    ? (pass('Admin wrong password blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Admin wrong password blocked', `Got ${r.status}`), failed++);

  // [17] Admin — no password
  r = await request('GET', '/api/admin/bookings');
  r.status === 401
    ? (pass('Admin no password blocked', `${r.status} → ${r.body.message}`), passed++)
    : (fail('Admin no password blocked', `Got ${r.status}`), failed++);

  // [18] Admin — view all bookings
  r = await request('GET', '/api/admin/bookings', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin GET /bookings', `Total bookings: ${r.body.totalBookings}`), passed++)
    : (fail('Admin GET /bookings', r.body.message), failed++);

  // [19] Admin — view all students
  r = await request('GET', '/api/admin/students', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin GET /students', `Total students: ${r.body.totalStudents}`), passed++)
    : (fail('Admin GET /students', r.body.message), failed++);

  // [20] Admin — cancel seat 7
  r = await request('DELETE', '/api/admin/booking/7', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin cancel seat 7', r.body.message), passed++)
    : (fail('Admin cancel seat 7', r.body.message), failed++);

  // [21] Admin — reset all
  r = await request('DELETE', '/api/admin/reset', null, { 'X-Admin-Password': ADMIN_PASS });
  r.body.success
    ? (pass('Admin reset all seats', r.body.message), passed++)
    : (fail('Admin reset all seats', r.body.message), failed++);

  // ── Post-test cleanup ────────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  await Student.deleteMany({ email: { $in: ['ali@test.com', 'sara@test.com'] } });
  await mongoose.disconnect();
  console.log('\n  🧹 Test data cleaned up.');

  // ── Summary ──────────────────────────────────────────────────────────────────
  section(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('  🎉 ALL TESTS PASSED!\n');
  else console.log(`  ⚠️  ${failed} test(s) failed. Check output above.\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
