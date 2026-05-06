const Seat = require('../models/Seat');
const Student = require('../models/Student');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all 38 seats with booking status
// @route   GET /api/seats
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getAllSeats = async (req, res, next) => {
  try {
    const seats = await Seat.find().sort({ seatNumber: 1 }).populate({
      path: 'bookedBy',
      select: 'name rollNumber email',
    });

    const leftSeats = seats.filter((s) => s.side === 'left');
    const rightSeats = seats.filter((s) => s.side === 'right');
    const totalBooked = seats.filter((s) => s.isBooked).length;
    const totalAvailable = seats.length - totalBooked;

    res.status(200).json({
      success: true,
      summary: {
        total: seats.length,
        booked: totalBooked,
        available: totalAvailable,
      },
      leftSeats,
      rightSeats,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Book a seat for the logged-in student
// @route   POST /api/seats/book
// @access  Private (Student JWT)
// ─────────────────────────────────────────────────────────────────────────────
const bookSeat = async (req, res, next) => {
  try {
    const { seatNumber } = req.body;
    const studentId = req.student.id;

    if (!seatNumber) {
      const err = new Error('Seat number is required');
      err.statusCode = 400;
      return next(err);
    }

    // Fetch student
    const student = await Student.findById(studentId);
    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      return next(err);
    }

    if (!student.isVerified) {
      const err = new Error('Please verify your OTP before booking a seat');
      err.statusCode = 403;
      return next(err);
    }

    // Prevent double booking
    if (student.bookedSeat) {
      const err = new Error('You have already booked a seat. Cancel it first to book another.');
      err.statusCode = 409;
      return next(err);
    }

    // Find the seat
    const seat = await Seat.findOne({ seatNumber });
    if (!seat) {
      const err = new Error(`Seat ${seatNumber} does not exist`);
      err.statusCode = 404;
      return next(err);
    }

    if (seat.isBooked) {
      const err = new Error(`Seat ${seatNumber} is already booked`);
      err.statusCode = 409;
      return next(err);
    }

    // Book the seat atomically
    seat.isBooked = true;
    seat.bookedBy = studentId;
    seat.bookedAt = new Date();
    await seat.save();

    // Link seat to student
    student.bookedSeat = seat._id;
    await student.save();

    res.status(200).json({
      success: true,
      message: `Seat ${seatNumber} (${seat.side} side) booked successfully!`,
      seat: {
        seatNumber: seat.seatNumber,
        side: seat.side,
        bookedAt: seat.bookedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllSeats, bookSeat };
