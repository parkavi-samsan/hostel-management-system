const express = require('express');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { protect, authorize } = require('../middleware/authMiddleware');

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
        .populate('roomId', 'roomNumber');
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

// UPDATE request (staff/admin) - assign, change status, add update note
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status, assignedTo, updateNote } = req.body;
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (status) request.status = status;
    if (assignedTo) request.assignedTo = assignedTo;
    if (updateNote) request.updates.push({ text: updateNote });

    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;