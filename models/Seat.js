const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 38,
    },
    side: {
      type: String,
      enum: ['left', 'right'],
      required: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    bookedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Seat', seatSchema);
