const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  paymentId: { type: String, default: null },
  paidAt: { type: Date, default: null }
});

const billSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // e.g. "2026-09"
  roomFee: { type: Number, required: true },
  utilities: { type: Number, default: 0 },
  additionalCharges: { type: Number, default: 0 },
  lateFee: { type: Number, default: 0 },
  lateFeeApplied: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  dueDate: { type: Date },
  installments: [installmentSchema],
  status: {
    type: String,
    enum: ['paid', 'unpaid', 'overdue'],
    default: 'unpaid'
  },
  paymentId: { type: String, default: null },
  paidAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);