const express = require('express');
const User = require('../models/User');
const Bill = require('../models/Bill');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all residents (admin/staff only)
router.get('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const residents = await User.find({ role: 'resident' })
      .select('-password')
      .populate('roomId', 'roomNumber');
    res.json(residents);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET one resident's full record: details, room history, bills and requests (admin/staff only)
router.get('/:id', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const resident = await User.findOne({ _id: req.params.id, role: 'resident' })
      .select('-password')
      .populate('roomId', 'roomNumber type');
    if (!resident) return res.status(404).json({ message: 'Resident not found' });

    const [bills, requests] = await Promise.all([
      Bill.find({ residentId: resident._id }).sort({ createdAt: -1 }).limit(12),
      MaintenanceRequest.find({ residentId: resident._id })
        .populate('roomId', 'roomNumber')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const dues = bills
      .filter((b) => b.status !== 'paid')
      .reduce((sum, b) => {
        if (b.installments && b.installments.length > 0) {
          return sum + b.installments.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);
        }
        return sum + b.totalAmount;
      }, 0);

    res.json({ resident, bills, requests, dues });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// EDIT a resident's record (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, phone, emergencyContact, roomPreference } = req.body;

    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email' });
    if (phone && !/^[0-9]{10}$/.test(phone)) return res.status(400).json({ message: 'Phone must be 10 digits' });
    if (emergencyContact && !/^[0-9]{10}$/.test(emergencyContact)) {
      return res.status(400).json({ message: 'Emergency contact must be 10 digits' });
    }

    const resident = await User.findOne({ _id: req.params.id, role: 'resident' });
    if (!resident) return res.status(404).json({ message: 'Resident not found' });

    const clash = await User.findOne({ email: email.trim(), _id: { $ne: resident._id } });
    if (clash) return res.status(400).json({ message: 'Another account already uses this email' });

    resident.name = String(name).trim();
    resident.email = email.trim();
    resident.phone = phone || '';
    resident.emergencyContact = emergencyContact || '';
    if (roomPreference) {
      resident.roomPreference = {
        roomType: ['single', 'double', 'dorm'].includes(roomPreference.roomType) ? roomPreference.roomType : '',
        notes: String(roomPreference.notes || '').slice(0, 300)
      };
    }
    await resident.save();

    const safe = resident.toObject();
    delete safe.password;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
