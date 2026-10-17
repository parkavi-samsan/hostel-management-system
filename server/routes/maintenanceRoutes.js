const express = require('express');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const User = require('../models/User');
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/authMiddleware');
const { notify, notifyRoles } = require('../utils/notify');

const router = express.Router();

// CREATE request (resident)
router.post('/', protect, async (req, res) => {
  try {
    const { roomId, issue, priority } = req.body;
    const request = new MaintenanceRequest({
      residentId: req.user.id,
      roomId,
      issue,
      priority
    });
    await request.save();

    const room = await Room.findById(roomId).select('roomNumber');
    await notifyRoles(
      ['admin'],
      `New ${priority || 'medium'} priority request from room ${room?.roomNumber || '-'}: ${issue}`,
      'maintenance'
    );

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all requests (admin/staff see all, resident sees own)
router.get('/', protect, async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'resident') {
      requests = await MaintenanceRequest.find({ residentId: req.user.id })
        .populate('roomId', 'roomNumber')
        .populate('assignedTo', 'name');
    } else {
      requests = await MaintenanceRequest.find()
        .populate('residentId', 'name email')
        .populate('roomId', 'roomNumber')
        .populate('assignedTo', 'name');
    }
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET staff list for assignment dropdown (admin only)
router.get('/staff-list', protect, authorize('admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('name email');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE request (staff/admin) - assign, change status, add update note
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status, assignedTo, updateNote } = req.body;
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const statusChanged = status && status !== request.status;
    const newlyAssigned = assignedTo && String(assignedTo) !== String(request.assignedTo);

    if (status) request.status = status;
    if (assignedTo) request.assignedTo = assignedTo;
    if (updateNote) request.updates.push({ text: updateNote });

    await request.save();

    if (statusChanged) {
      await notify(
        request.residentId,
        `Your maintenance request "${request.issue}" is now ${request.status}.`,
        'maintenance'
      );
    }
    if (newlyAssigned) {
      await notify(assignedTo, `You have been assigned a maintenance request: ${request.issue}`, 'maintenance');
      await notify(
        request.residentId,
        `Your maintenance request "${request.issue}" has been assigned to a staff member.`,
        'maintenance'
      );
    }
    if (updateNote) {
      await notify(
        request.residentId,
        `New update on your request "${request.issue}": ${updateNote}`,
        'maintenance'
      );
    }

    const updated = await MaintenanceRequest.findById(request._id)
      .populate('residentId', 'name email')
      .populate('roomId', 'roomNumber')
      .populate('assignedTo', 'name');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;