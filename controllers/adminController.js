const Seat = require('../models/Seat');
const Student = require('../models/Student');
const OTP = require('../models/OTP');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all bookings (admin view)
// @route   GET /api/admin/bookings
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Seat.find({ isBooked: true })
      .sort({ seatNumber: 1 })
      .populate({ path: 'bookedBy', select: 'name email rollNumber' });

    res.status(200).json({
      success: true,
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Cancel a specific seat booking (admin only)
// @route   DELETE /api/admin/booking/:seatNumber
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const cancelBooking = async (req, res, next) => {
  try {
    const seatNumber = parseInt(req.params.seatNumber, 10);

    const seat = await Seat.findOne({ seatNumber });
    if (!seat) {
      const err = new Error(`Seat ${seatNumber} does not exist`);
      err.statusCode = 404;
      return next(err);
    }

    if (!seat.isBooked) {
      const err = new Error(`Seat ${seatNumber} is not currently booked`);
      err.statusCode = 400;
      return next(err);
    }

    // Remove seat reference from student
    if (seat.bookedBy) {
      await Student.findByIdAndUpdate(seat.bookedBy, { bookedSeat: null });
    }

    // Free the seat
    seat.isBooked = false;
    seat.bookedBy = null;
    seat.bookedAt = null;
    await seat.save();

    res.status(200).json({
      success: true,
      message: `Seat ${seatNumber} booking cancelled successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Reset ALL seat bookings (admin only)
// @route   DELETE /api/admin/reset
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const resetAllSeats = async (req, res, next) => {
  try {
    // Clear all seat bookings
    await Seat.updateMany({}, { isBooked: false, bookedBy: null, bookedAt: null });

    // Clear bookedSeat from all students
    await Student.updateMany({}, { bookedSeat: null });

    res.status(200).json({
      success: true,
      message: 'All seat bookings have been reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all registered students (admin view)
// @route   GET /api/admin/students
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const getAllStudents = async (req, res, next) => {
  try {
    const students = await Student.find()
      .sort({ createdAt: -1 })
      .populate({ path: 'bookedSeat', select: 'seatNumber side' });

    res.status(200).json({
      success: true,
      totalStudents: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Completely delete a student (as if they never registered)
// @route   DELETE /api/admin/student/:studentId
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const deleteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      return next(err);
    }

    // 1. Free their booked seat (if any)
    if (student.bookedSeat) {
      await Seat.findByIdAndUpdate(student.bookedSeat, {
        isBooked: false,
        bookedBy: null,
        bookedAt: null,
      });
    }

    // 2. Delete any pending OTP records for this email
    await OTP.deleteMany({ email: student.email });

    // 3. Delete the student document completely
    await Student.findByIdAndDelete(studentId);

    res.status(200).json({
      success: true,
      message: `Student "${student.name}" (${student.email}) has been completely removed`,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Seed the database with 38 seats (19 left + 19 right)
// @route   POST /api/admin/seed
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const seedSeats = async (req, res, next) => {
  try {
    console.log('🌱 [Seed] Starting seat seed operation...');

    // Clear all existing seats
    await Seat.deleteMany({});
    console.log('🗑️  [Seed] Cleared existing seats');

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
    console.log(`✅ [Seed] Successfully seeded ${seats.length} seats (19 left + 19 right)`);

    res.status(200).json({
      success: true,
      message: `Seeded ${seats.length} seats`,
      count: seats.length,
    });
  } catch (error) {
    console.error('❌ [Seed] Seeding failed:', error.message);
    next(error);
  }
};

module.exports = { getAllBookings, cancelBooking, resetAllSeats, getAllStudents, deleteStudent, seedSeats };
