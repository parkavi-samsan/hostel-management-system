const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['single', 'double', 'dorm'],
    default: 'single'
  },
  capacity: { type: Number, required: true },
  occupants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
  },
  monthlyRent: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);