const express = require('express');
const Bill = require('../models/Bill');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const LATE_FEE_RATE = 0.05; // 5% of base charges, added once when a bill becomes overdue

// Unpaid bill past its due date -> mark overdue and add the late fee (only once)
async function refreshOverdue(bill) {
  if (bill.status === 'unpaid' && bill.dueDate && bill.dueDate < new Date()) {
    bill.status = 'overdue';
    if (!bill.lateFeeApplied) {
      const base = bill.roomFee + bill.utilities + bill.additionalCharges;
      const fee = Math.round(base * LATE_FEE_RATE);
      bill.lateFee += fee;
      bill.totalAmount += fee;
      bill.lateFeeApplied = true;
    }
    await bill.save();
  }
  return bill;
}

// CREATE bill (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { residentId, month, roomFee, utilities, additionalCharges, lateFee, discount, dueDate } = req.body;

    const resident = await User.findById(residentId);
    if (!resident || resident.role !== 'resident') {
      return res.status(400).json({ message: 'Invalid resident' });
    }
    if (!/^\d{4}-\d{2}$/.test(month || '')) {
      return res.status(400).json({ message: 'Month must be in YYYY-MM format' });
    }

    const fee = Number(roomFee || 0);
    const util = Number(utilities || 0);
    const extra = Number(additionalCharges || 0);
    const late = Number(lateFee || 0);
    const disc = Number(discount || 0);

    if ([fee, util, extra, late, disc].some((n) => Number.isNaN(n) || n < 0)) {
      return res.status(400).json({ message: 'Amounts must be valid, non-negative numbers' });
    }

    const totalAmount = fee + util + extra + late - disc;
    if (totalAmount < 0) {
      return res.status(400).json({ message: 'Discount cannot be more than the total charges' });
    }

    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    const bill = new Bill({
      residentId,
      month,
      roomFee: fee,
      utilities: util,
      additionalCharges: extra,
      lateFee: late,
      discount: disc,
      totalAmount,
      dueDate: due
    });
    await bill.save();
    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET bills (admin/staff see all, resident sees own)
router.get('/', protect, async (req, res) => {
  try {
    let bills;
    if (req.user.role === 'resident') {
      bills = await Bill.find({ residentId: req.user.id }).sort({ createdAt: -1 });
    } else {
      bills = await Bill.find().populate('residentId', 'name email').sort({ createdAt: -1 });
    }
    await Promise.all(bills.map((b) => refreshOverdue(b)));
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// MARK bill as paid (resident can pay own bill; admin/staff any bill)
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (req.user.role === 'resident' && String(bill.residentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only pay your own bills' });
    }
    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Bill is already paid' });
    }

    await refreshOverdue(bill); // include the latest late fee before payment

    bill.status = 'paid';
    bill.paidAt = new Date();
    bill.paymentId = req.body.paymentId || 'TEST_PAYMENT_' + Date.now();
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single bill with resident details (used for the invoice)
router.get('/:id', protect, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('residentId', 'name email phone');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (req.user.role === 'resident' && String(bill.residentId._id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await refreshOverdue(bill);
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;