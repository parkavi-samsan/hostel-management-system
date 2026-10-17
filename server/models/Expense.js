const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['maintenance', 'utilities', 'salaries', 'food', 'supplies', 'other'],
    default: 'other'
  },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
