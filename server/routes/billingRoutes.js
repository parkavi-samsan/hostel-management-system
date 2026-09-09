const express = require('express');
const Bill = require('../models/Bill');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// CREATE bill (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { residentId, month, roomFee, utilities, additionalCharges, lateFee, discount } = req.body;
const totalAmount = Number(roomFee || 0) + Number(utilities || 0) + Number(additionalCharges || 0) + Number(lateFee || 0) - Number(discount || 0);
    const bill = new Bill({
      residentId, month, roomFee, utilities, additionalCharges, lateFee, discount, totalAmount
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
      bills = await Bill.find({ residentId: req.user.id });
    } else {
      bills = await Bill.find().populate('residentId', 'name email');
    }
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// MARK bill as paid (admin/staff, or resident during "payment")
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    bill.status = 'paid';
    bill.paidAt = new Date();
    bill.paymentId = req.body.paymentId || 'TEST_PAYMENT_' + Date.now();

    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;