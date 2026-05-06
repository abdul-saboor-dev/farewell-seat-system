// ── Crypto Polyfill (required by mongoose/mongodb driver on Node < 17) ─────────
// globalThis.crypto is the Web Crypto API; ensure it's defined before anything else
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

// ─── Connect to MongoDB then auto-seed if empty ───────────────────────────────────────────
const runSeedOnce = async () => {
  try {
    const count = await Seat.countDocuments();
    if (count === 0) {
      console.log('🌱 No seats found — seeding 38 seats for first run...');
      await seedSeats();
      console.log('✅ Auto-seed complete: 38 seats ready');
    } else {
      console.log(`ℹ️  Seats already exist (${count} found) — skipping seed`);
    }
  } catch (err) {
    console.error('❌ Auto-seed error:', err.message);
    // Non-fatal — server continues even if seed fails
  }
};

connectDB().then(runSeedOnce);

// ─── Initialize Express App ───────────────────────────────────────────────────
const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: 'https://farewell-seat-system.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Password'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check Route ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎓 Farewell Seat Reservation API is running!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// Phase 2: Auth routes ✅
app.use('/api/auth', require('./routes/authRoutes'));


// Phase 3: Seat routes ✅
app.use('/api/seats', require('./routes/seatRoutes'));

// Phase 4: Admin routes ✅
app.use('/api/admin', require('./routes/adminRoutes'));

// ─── Serve Static Frontend (AFTER API routes) ─────────────────────────────────────
// Placed after /api/* so static middleware never shadows API endpoints
app.use(express.static(path.join(__dirname, 'public')));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler (must be last middleware) ───────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
// Bind to 0.0.0.0 — required for Railway/Render (default 127.0.0.1 is not reachable externally)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 Health check available at /api/health`);
});
