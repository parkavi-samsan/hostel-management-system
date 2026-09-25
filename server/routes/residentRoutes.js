const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all residents (admin/staff only)
router.get('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const residents = await User.find({ role: 'resident' }).select('-password');
    res.json(residents);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;