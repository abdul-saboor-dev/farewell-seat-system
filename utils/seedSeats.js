/**
 * Seat Seeder Script
 * Run ONCE to initialize all 38 seats in MongoDB.
 * Usage: node utils/seedSeats.js
 *
 * Seats 1–19  → left side
 * Seats 20–38 → right side
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Seat = require('../models/Seat');

const seedSeats = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing seats
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
    console.log(`🪑 Successfully seeded 38 seats (19 left + 19 right)`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedSeats();
