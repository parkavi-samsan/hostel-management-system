const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Bill = require('../models/Bill');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');
const { notify, notifyRoles } = require('../utils/notify');

const router = express.Router();

const LATE_FEE_RATE = 0.05; // 5% of base charges, added once when a bill becomes overdue
const DAY = 24 * 60 * 60 * 1000;

// residentId can be a plain id or a populated user document
const idOf = (ref) => (ref && ref._id ? ref._id : ref);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : 'not set');

// Online payments work only when Razorpay keys are present in the environment
const gatewayEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const getRazorpay = () =>
  new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

// Keeps a bill's status up to date. Bills with a payment plan are overdue when
// an installment is late (no extra late fee); other bills get a one-time late fee.
async function refreshOverdue(bill) {
  if (bill.installments && bill.installments.length > 0) {
    if (bill.status !== 'paid') {
      const late = bill.installments.some((i) => i.status === 'unpaid' && i.dueDate < new Date());
      const newStatus = late ? 'overdue' : 'unpaid';
      if (newStatus !== bill.status) {
        bill.status = newStatus;
        await bill.save();
        if (late) {
          await notify(
            idOf(bill.residentId),
            `An installment of your bill for ${bill.month} is overdue. Please pay it soon.`,
            'billing'
          );
        }
      }
    }
    return bill;
  }

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
    await notify(
      idOf(bill.residentId),
      `Your bill for ${bill.month} is overdue. A late fee has been added, total payable is ₹${bill.totalAmount}.`,
      'billing'
    );
  }
  return bill;
}

// Works out what is being paid: the whole bill, or one installment of a plan
function payableItem(bill, installmentIndex) {
  const hasPlan = bill.installments && bill.installments.length > 0;
  if (!hasPlan) return { amount: bill.totalAmount };

  const idx = Number(installmentIndex);
  const inst = bill.installments[idx];
  if (!Number.isInteger(idx) || !inst) return { error: 'Choose a valid installment to pay' };
  if (inst.status === 'paid') return { error: 'This installment is already paid' };
  return { amount: inst.amount, index: idx };
}

// Saves a payment against the bill (or one installment) and sends notifications
async function recordPayment(bill, item, paymentId, byResident) {
  if (item.index !== undefined) {
    const inst = bill.installments[item.index];
    inst.status = 'paid';
    inst.paymentId = paymentId;
    inst.paidAt = new Date();
    if (bill.installments.every((i) => i.status === 'paid')) {
      bill.status = 'paid';
      bill.paidAt = new Date();
      bill.paymentId = paymentId;
    }
  } else {
    bill.status = 'paid';
    bill.paidAt = new Date();
    bill.paymentId = paymentId;
  }
  await bill.save();

  await notify(
    idOf(bill.residentId),
    `Payment of ₹${item.amount} received for ${bill.month}. Thank you!`,
    'billing'
  );
  if (byResident) {
    await notifyRoles(['admin'], `A resident paid ₹${item.amount} for the ${bill.month} bill.`, 'billing');
  }
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

    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 10 * DAY);

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

    await notify(
      residentId,
      `A new bill of ₹${totalAmount} for ${month} has been generated. Due date: ${fmtDate(due)}.`,
      'billing'
    );

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

// Tells the frontend whether online payment is available
router.get('/payment-config', protect, (req, res) => {
  const enabled = gatewayEnabled();
  res.json({ enabled, keyId: enabled ? process.env.RAZORPAY_KEY_ID : null });
});

// RECORD a payment without the gateway.
// Admin/staff: cash or offline payment. Residents: only when the gateway is not configured (demo mode).
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const byResident = req.user.role === 'resident';
    if (byResident) {
      if (gatewayEnabled()) {
        return res.status(403).json({ message: 'Please use the online payment option' });
      }
      if (String(bill.residentId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only pay your own bills' });
      }
    }
    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Bill is already paid' });
    }

    await refreshOverdue(bill);

    const item = payableItem(bill, req.body.installmentIndex);
    if (item.error) return res.status(400).json({ message: item.error });

    const paymentId = (byResident ? 'DEMO_' : 'CASH_') + Date.now();
    await recordPayment(bill, item, paymentId, byResident);
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// STEP 1 of online payment: create a Razorpay order (resident, own bill)
router.post('/:id/create-order', protect, async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ message: 'Online payment is available for residents only' });
    }
    if (!gatewayEnabled()) {
      return res.status(503).json({ message: 'Online payment is not configured' });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (String(bill.residentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only pay your own bills' });
    }
    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Bill is already paid' });
    }

    await refreshOverdue(bill);

    const item = payableItem(bill, req.body.installmentIndex);
    if (item.error) return res.status(400).json({ message: item.error });

    const order = await getRazorpay().orders.create({
      amount: Math.round(item.amount * 100), // Razorpay works in paise
      currency: 'INR',
      receipt: 'rcpt_' + String(bill._id).slice(-10) + '_' + Date.now(),
      notes: {
        billId: String(bill._id),
        installment: item.index === undefined ? 'full' : String(item.index)
      }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not start the payment', error: err.message });
  }
});

// STEP 2 of online payment: verify the signature and mark the bill/installment paid
router.post('/:id/verify-payment', protect, async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ message: 'Online payment is available for residents only' });
    }
    if (!gatewayEnabled()) {
      return res.status(503).json({ message: 'Online payment is not configured' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, installmentIndex } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (String(bill.residentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only pay your own bills' });
    }
    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Bill is already paid' });
    }

    const item = payableItem(bill, installmentIndex);
    if (item.error) return res.status(400).json({ message: item.error });

    // Make sure this order was created for exactly this bill, installment and amount
    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    const expectedInstallment = item.index === undefined ? 'full' : String(item.index);
    if (
      !order.notes ||
      order.notes.billId !== String(bill._id) ||
      order.notes.installment !== expectedInstallment ||
      order.amount !== Math.round(item.amount * 100)
    ) {
      return res.status(400).json({ message: 'Payment does not match this bill' });
    }

    await recordPayment(bill, item, razorpay_payment_id, true);
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CREATE a payment plan: split an unpaid bill into 2-6 installments (admin only)
router.post('/:id/plan', protect, authorize('admin'), async (req, res) => {
  try {
    const count = Number(req.body.count);
    if (!Number.isInteger(count) || count < 2 || count > 6) {
      return res.status(400).json({ message: 'Choose between 2 and 6 installments' });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Bill is already paid' });
    }
    if (bill.installments.length > 0) {
      return res.status(400).json({ message: 'A payment plan already exists for this bill' });
    }

    await refreshOverdue(bill); // include any late fee before splitting

    const total = bill.totalAmount;
    const each = Math.floor(total / count);
    const installments = [];
    for (let i = 0; i < count; i++) {
      installments.push({
        amount: i === count - 1 ? total - each * (count - 1) : each,
        dueDate: new Date(Date.now() + (7 + i * 30) * DAY) // first in 7 days, then every 30 days
      });
    }

    bill.installments = installments;
    bill.status = 'unpaid';
    await bill.save();

    await notify(
      idOf(bill.residentId),
      `A payment plan of ${count} installments was set for your ${bill.month} bill. First installment: ₹${installments[0].amount}, due ${fmtDate(installments[0].dueDate)}.`,
      'billing'
    );

    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// SEND a payment reminder to the resident (admin only)
router.post('/:id/remind', protect, authorize('admin'), async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'Bill is already paid' });
    }

    await refreshOverdue(bill);

    const next = bill.installments.find((i) => i.status === 'unpaid');
    const text = next
      ? `Reminder: an installment of ₹${next.amount} for your ${bill.month} bill is due on ${fmtDate(next.dueDate)}.`
      : `Reminder: your bill for ${bill.month} of ₹${bill.totalAmount} is ${bill.status}. Due date: ${fmtDate(bill.dueDate)}.`;

    await notify(idOf(bill.residentId), text, 'billing');
    res.json({ message: 'Reminder sent' });
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

// Used by the background scheduler so overdue status and late fees update without anyone opening the page
router.refreshOverdue = refreshOverdue;
router.DAY = DAY;

module.exports = router;