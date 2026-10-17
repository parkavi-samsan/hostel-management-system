const express = require('express');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
const CATEGORIES = ['maintenance', 'utilities', 'salaries', 'food', 'supplies', 'other'];

// Checks and cleans the fields sent from the form
function cleanBody(body) {
  const title = String(body.title || '').trim();
  const amount = Number(body.amount);
  if (!title) return { error: 'Title is required' };
  if (Number.isNaN(amount) || amount <= 0) return { error: 'Amount must be a number greater than 0' };
  const category = CATEGORIES.includes(body.category) ? body.category : 'other';
  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) return { error: 'Invalid date' };
  return { value: { title, amount, category, date, notes: String(body.notes || '').slice(0, 300) } };
}

// GET all expenses, newest first (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CREATE expense (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { value, error } = cleanBody(req.body);
    if (error) return res.status(400).json({ message: error });
    const expense = await Expense.create({ ...value, createdBy: req.user.id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE expense (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { value, error } = cleanBody(req.body);
    if (error) return res.status(400).json({ message: error });
    const expense = await Expense.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE expense (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
