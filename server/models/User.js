const mongoose = require('mongoose');

const roomHistorySchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomNumber: { type: String },
  checkIn: { type: Date, default: Date.now },
  checkOut: { type: Date, default: null }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'staff', 'resident'],
    default: 'resident'
  },
  phone: { type: String },
  emergencyContact: { type: String },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  roomHistory: [roomHistorySchema],
  roomPreference: {
    roomType: { type: String, enum: ['', 'single', 'double', 'dorm'], default: '' },
    notes: { type: String, default: '' }
  },
  notifyEmail: { type: Boolean, default: true },
  notifySms: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);