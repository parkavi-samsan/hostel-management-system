const mongoose = require('mongoose');

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
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);