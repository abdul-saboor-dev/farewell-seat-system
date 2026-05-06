// ── Crypto Polyfill (required by mongoose/mongodb driver on Node < 17) ─────────
// globalThis.crypto is the Web Crypto API; ensure it's defined before anything else
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const path    = require('path');
const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ─── Load Environment Variables ───────────────────────────────────────────────
dotenv.config();

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ─── Initialize Express App ───────────────────────────────────────────────────
const app = express();

// ─── CORS — Allow Vercel frontend to call Railway backend ────────────────────
// Note: credentials:true is incompatible with origin:'*'.
// We use JWT in Authorization headers (not cookies), so credentials not needed.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Admin-Password',
  ],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve Static Frontend Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

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
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
