const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // ── Device-Based Identity ─────────────────────────────────────────────────
    // This is the primary authentication key.
    // Set at account creation and NEVER changed.
    // sparse: true → allows the field to be absent in old documents without
    //                violating the unique index.
    deviceId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    bookedSeat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', studentSchema);
