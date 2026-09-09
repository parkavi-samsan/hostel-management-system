const express = require('express');
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all rooms (any logged-in user)
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find().populate('occupants', 'name email');
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CREATE room (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { roomNumber, type, capacity, monthlyRent } = req.body;
    const room = new Room({ roomNumber, type, capacity, monthlyRent });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE room (admin only) - e.g. change status
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE room (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
