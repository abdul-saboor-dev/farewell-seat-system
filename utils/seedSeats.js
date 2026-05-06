/**
 * Seat Seeder Script
 * Can be used two ways:
 *   1. As a module: const seedSeats = require('./seedSeats'); await seedSeats();
 *   2. As a standalone script: node utils/seedSeats.js
 *
 * Seats 1–19  → left side
 * Seats 20–38 → right side
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const Seat = require('../models/Seat');

// ── Pure seed function (no connect/disconnect) ────────────────────────────────
// Safe to call when a MongoDB connection is already open (e.g. from server.js)
const seedSeats = async () => {
  // Clear existing seats first
  await Seat.deleteMany({});
  console.log('🗑️  Cleared existing seats');

  const seats = [];

  // Left side: seats 1–19
  for (let i = 1; i <= 19; i++) {
    seats.push({ seatNumber: i, side: 'left' });
  }

  // Right side: seats 20–38
  for (let i = 20; i <= 38; i++) {
    seats.push({ seatNumber: i, side: 'right' });
  }

  await Seat.insertMany(seats);
  console.log('🪑 Successfully seeded 38 seats (19 left + 19 right)');
};

module.exports = seedSeats;

// ── Standalone script mode (run directly via CLI) ─────────────────────────────
// Only runs when called as: node utils/seedSeats.js
if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB');

      await seedSeats();

      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      process.exit(1);
    }
  })();
}
