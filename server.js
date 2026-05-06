// ── Crypto Polyfill (required by mongoose/mongodb driver on Node < 17) ─────────
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const Seat = require('./models/Seat');
const seedSeats = require('./utils/seedSeats');

// ─── Load Environment Variables ───────────────────────────────────────────────
dotenv.config();

// ─── Connect DB + Auto Seed ───────────────────────────────────────────────────
const runSeedOnce = async () => {
  try {
    const count = await Seat.countDocuments();
    if (count === 0) {
      console.log('🌱 No seats found — seeding 38 seats for first run...');
      await seedSeats();
      console.log('✅ Auto-seed complete: 38 seats ready');
    } else {
      console.log(`ℹ️ Seats already exist (${count}) — skipping seed`);
    }
  } catch (err) {
    console.error('❌ Auto-seed error:', err.message);
  }
};

connectDB().then(runSeedOnce);

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

// ─── CORS (FINAL FIX FOR RAILWAY + VERCEL) ───────────────────────────────────
app.use(cors({
  origin: 'https://farewell-seat-system.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Password'],
  credentials: true,
}));

// 🔥 IMPORTANT: manual preflight handler (fixes Railway CORS issue)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://farewell-seat-system.vercel.app");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Password");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎓 Farewell Seat Reservation API is running!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/seats', require('./routes/seatRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ─── Static Frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 Health check available at /api/health`);
});
