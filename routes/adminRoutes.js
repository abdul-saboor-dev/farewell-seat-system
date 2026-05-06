const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  cancelBooking,
  resetAllSeats,
  getAllStudents,
  deleteStudent,
  seedSeats,
} = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminMiddleware');

// Apply admin auth to ALL routes in this file
router.use(adminProtect);

// @route  GET    /api/admin/bookings
// @desc   View all booked seats
router.get('/bookings', getAllBookings);

// @route  GET    /api/admin/students
// @desc   View all registered students
router.get('/students', getAllStudents);

// @route  DELETE /api/admin/booking/:seatNumber
// @desc   Cancel a specific seat booking
router.delete('/booking/:seatNumber', cancelBooking);

// @route  DELETE /api/admin/reset
// @desc   Reset ALL seat bookings
router.delete('/reset', resetAllSeats);

// @route  DELETE /api/admin/student/:studentId
// @desc   Completely delete a student (wipes registration + frees seat + deletes OTPs)
router.delete('/student/:studentId', deleteStudent);

// @route  POST   /api/admin/seed
// @desc   Seed the database with 38 seats (19 left + 19 right). Run once to initialise.
router.post('/seed', seedSeats);

module.exports = router;
