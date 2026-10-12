const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Bill = require('../models/Bill');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// GET dashboard statistics (admin/staff)
router.get('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const rooms = await Room.find();
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalOccupants = rooms.reduce((sum, r) => sum + r.occupants.length, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;

    const totalResidents = await User.countDocuments({ role: 'resident' });

    const maintenance = {
      pending: await MaintenanceRequest.countDocuments({ status: 'pending' }),
      inProgress: await MaintenanceRequest.countDocuments({ status: 'in-progress' }),
      resolved: await MaintenanceRequest.countDocuments({ status: 'resolved' })
    };

    const bills = await Bill.find();
    const totalBilled = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalCollected = bills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.totalAmount, 0);
    const totalPending = totalBilled - totalCollected;

    // Monthly revenue (paid vs unpaid per month)
    const monthlyMap = {};
    bills.forEach((b) => {
      if (!monthlyMap[b.month]) monthlyMap[b.month] = { month: b.month, collected: 0, pending: 0 };
      if (b.status === 'paid') monthlyMap[b.month].collected += b.totalAmount;
      else monthlyMap[b.month].pending += b.totalAmount;
    });
    const monthlyRevenue = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      rooms: {
        total: rooms.length,
        available: rooms.filter((r) => r.occupants.length < r.capacity).length,
        full: rooms.filter((r) => r.occupants.length >= r.capacity).length,
        occupancyRate,
        totalCapacity,
        totalOccupants
      },
      totalResidents,
      maintenance,
      billing: { totalBilled, totalCollected, totalPending },
      monthlyRevenue
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;