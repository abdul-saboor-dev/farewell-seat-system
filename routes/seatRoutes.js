const express = require('express');
const router = express.Router();
const { getAllSeats, bookSeat } = require('../controllers/seatController');
const { protect } = require('../middleware/authMiddleware');

// @route  GET  /api/seats
// @desc   Get all 38 seats with availability status (public)
router.get('/', getAllSeats);

// @route  POST /api/seats/book
// @desc   Book a seat (student must be logged in)
router.post('/book', protect, bookSeat);

module.exports = router;
