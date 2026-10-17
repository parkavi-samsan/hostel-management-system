const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const { notify, notifyRoles } = require('../utils/notify');
const { recordSnapshot } = require('../utils/snapshot');

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

// SUGGEST available rooms for a resident, best match for their room preference first (admin/staff)
router.get('/suggest/:residentId', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const resident = await User.findById(req.params.residentId).select('roomPreference roomId');
    if (!resident) return res.status(404).json({ message: 'Resident not found' });

    const preferred = resident.roomPreference?.roomType || '';
    const rooms = await Room.find({ status: { $ne: 'maintenance' } });
    const open = rooms.filter(
      (r) => r.occupants.length < r.capacity && String(r._id) !== String(resident.roomId)
    );
    open.sort((a, b) => Number(b.type === preferred) - Number(a.type === preferred));

    res.json({
      preferredType: preferred || null,
      notes: resident.roomPreference?.notes || '',
      rooms: open.map((r) => ({
        _id: r._id,
        roomNumber: r.roomNumber,
        type: r.type,
        monthlyRent: r.monthlyRent,
        freeBeds: r.capacity - r.occupants.length,
        matchesPreference: Boolean(preferred) && r.type === preferred
      }))
    });
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
    await recordSnapshot();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE room (admin only) - only the editable fields, occupants are changed via check-in/check-out
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const { roomNumber, type, capacity, monthlyRent, status } = req.body;
    if (capacity !== undefined && Number(capacity) < room.occupants.length) {
      return res.status(400).json({ message: `Capacity cannot be lower than the ${room.occupants.length} current occupant(s)` });
    }

    if (roomNumber !== undefined) room.roomNumber = roomNumber;
    if (type !== undefined) room.type = type;
    if (capacity !== undefined) room.capacity = Number(capacity);
    if (monthlyRent !== undefined) room.monthlyRent = Number(monthlyRent);
    if (status !== undefined) room.status = status;

    // Keep the status honest when the capacity changes (a room under maintenance stays that way)
    if (room.status !== 'maintenance') {
      room.status = room.occupants.length >= room.capacity ? 'occupied' : 'available';
    }
    await room.save();
    await recordSnapshot();
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE room (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const existing = await Room.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Room not found' });
    if (existing.occupants.length > 0) {
      return res.status(400).json({ message: 'Check out all residents before deleting this room' });
    }
    await existing.deleteOne();
    await recordSnapshot();
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

    if (room.occupants.some((o) => o.toString() === String(residentId))) {
      return res.status(400).json({ message: 'Resident already checked into this room' });
    }
    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ message: 'Room is already at full capacity' });
    }

    // Moving from a previous room: free the bed there
    let prevRoom = null;
    if (resident.roomId) {
      prevRoom = await Room.findById(resident.roomId);
      if (prevRoom) {
        prevRoom.occupants = prevRoom.occupants.filter(
          (o) => o.toString() !== String(resident._id)
        );
        prevRoom.status = 'available';
        await prevRoom.save();
      }
    }

    room.occupants.push(residentId);
    room.status = room.occupants.length >= room.capacity ? 'occupied' : 'available';
    await room.save();

    // Room change history: close open entry, add a new one
    resident.roomHistory.forEach((h) => {
      if (!h.checkOut) h.checkOut = new Date();
    });
    resident.roomHistory.push({
      roomId: room._id,
      roomNumber: room.roomNumber,
      checkIn: new Date()
    });
    resident.roomId = room._id;
    await resident.save();

    // Notifications
    await notify(resident._id, `You have been allotted room ${room.roomNumber}.`, 'room');
    if (prevRoom) {
      await notifyRoles(['admin', 'staff'], `Room ${prevRoom.roomNumber} now has a vacancy.`, 'room');
    }
    if (room.status === 'occupied') {
      await notifyRoles(['admin', 'staff'], `Room ${room.roomNumber} is now full.`, 'room');
    }

    await recordSnapshot();

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

    const wasOccupant = room.occupants.some((o) => o.toString() === String(residentId));

    room.occupants = room.occupants.filter((o) => o.toString() !== String(residentId));
    room.status = 'available';
    await room.save();

    const resident = await User.findById(residentId);
    if (resident) {
      resident.roomHistory.forEach((h) => {
        if (!h.checkOut && String(h.roomId) === String(room._id)) {
          h.checkOut = new Date();
        }
      });
      resident.roomId = null;
      await resident.save();
    }

    if (wasOccupant) {
      await notify(residentId, `You have been checked out of room ${room.roomNumber}.`, 'room');
      await notifyRoles(['admin', 'staff'], `Room ${room.roomNumber} now has a vacancy.`, 'room');
    }

    await recordSnapshot();

    const updatedRoom = await Room.findById(room._id).populate('occupants', 'name email');
    res.json(updatedRoom);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;