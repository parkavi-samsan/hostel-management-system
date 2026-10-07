const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
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

// UPDATE room (admin only) - e.g. change status, edit details
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

// CHECK-IN resident to room (admin only)
router.put('/:id/checkin', protect, authorize('admin'), async (req, res) => {
  try {
    const { residentId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const resident = await User.findById(residentId);
    if (!resident || resident.role !== 'resident') {
      return res.status(400).json({ message: 'Invalid resident' });
    }

    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ message: 'Room is already at full capacity' });
    }
    if (room.occupants.includes(residentId)) {
      return res.status(400).json({ message: 'Resident already checked into this room' });
    }

    // Remove resident from any previous room
    if (resident.roomId) {
      await Room.findByIdAndUpdate(resident.roomId, { $pull: { occupants: resident._id } });
    }

    room.occupants.push(residentId);
    room.status = room.occupants.length >= room.capacity ? 'occupied' : 'available';
    await room.save();

    resident.roomId = room._id;
    await resident.save();

    const updatedRoom = await Room.findById(room._id).populate('occupants', 'name email');
    res.json(updatedRoom);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CHECK-OUT resident from room (admin only)
router.put('/:id/checkout', protect, authorize('admin'), async (req, res) => {
  try {
    const { residentId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    room.occupants = room.occupants.filter((o) => o.toString() !== residentId);
    room.status = 'available';
    await room.save();

    await User.findByIdAndUpdate(residentId, { roomId: null });

    const updatedRoom = await Room.findById(room._id).populate('occupants', 'name email');
    res.json(updatedRoom);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;