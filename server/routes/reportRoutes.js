const express = require('express');
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');
const Room = require('../models/Room');
const OccupancySnapshot = require('../models/OccupancySnapshot');
const { protect, authorize } = require('../middleware/authMiddleware');
const { recordSnapshot } = require('../utils/snapshot');

const router = express.Router();

const monthKey = (d) => new Date(d).toISOString().slice(0, 7); // YYYY-MM

// The last `count` month keys, oldest first (e.g. ["2026-05", ..., "2026-10"])
function lastMonths(count) {
  const out = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

// Builds the whole financial report in one place so the JSON and CSV views always agree
async function buildReport(monthCount) {
  const months = lastMonths(monthCount);
  const start = new Date(months[0] + '-01T00:00:00.000Z');

  const [bills, expenses, rooms, snapshots] = await Promise.all([
    Bill.find(),
    Expense.find({ date: { $gte: start } }),
    Room.find(),
    OccupancySnapshot.find({ date: { $gte: start.toISOString().slice(0, 10) } }).sort({ date: 1 })
  ]);

  const monthly = months.map((m) => ({ month: m, billed: 0, revenue: 0, expenses: 0, net: 0 }));
  const byMonth = Object.fromEntries(monthly.map((r) => [r.month, r]));

  let outstanding = 0;
  let overdueCount = 0;

  bills.forEach((b) => {
    if (byMonth[b.month]) byMonth[b.month].billed += b.totalAmount;

    // Revenue is counted in the month the money actually arrived
    if (b.installments && b.installments.length > 0) {
      b.installments.forEach((i) => {
        if (i.status === 'paid' && i.paidAt && byMonth[monthKey(i.paidAt)]) byMonth[monthKey(i.paidAt)].revenue += i.amount;
        if (i.status === 'unpaid') outstanding += i.amount;
      });
    } else if (b.status === 'paid') {
      if (b.paidAt && byMonth[monthKey(b.paidAt)]) byMonth[monthKey(b.paidAt)].revenue += b.totalAmount;
    } else {
      outstanding += b.totalAmount;
    }
    if (b.status === 'overdue') overdueCount += 1;
  });

  const categoryMap = {};
  expenses.forEach((e) => {
    if (byMonth[monthKey(e.date)]) byMonth[monthKey(e.date)].expenses += e.amount;
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  monthly.forEach((r) => { r.net = r.revenue - r.expenses; });

  const expenseByCategory = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }));

  const typeMap = {};
  rooms.forEach((r) => {
    if (!typeMap[r.type]) typeMap[r.type] = { type: r.type, rooms: 0, capacity: 0, occupants: 0 };
    typeMap[r.type].rooms += 1;
    typeMap[r.type].capacity += r.capacity;
    typeMap[r.type].occupants += r.occupants.length;
  });
  const occupancyByType = Object.values(typeMap).map((t) => ({
    ...t,
    rate: t.capacity > 0 ? Math.round((t.occupants / t.capacity) * 100) : 0
  }));

  const totalRevenue = monthly.reduce((s, r) => s + r.revenue, 0);
  const totalExpenses = monthly.reduce((s, r) => s + r.expenses, 0);

  return {
    months: monthCount,
    totals: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      net: totalRevenue - totalExpenses,
      outstanding,
      overdueCount
    },
    monthly,
    expenseByCategory,
    occupancyByType,
    occupancyTrend: snapshots.map((s) => ({ date: s.date, rate: s.occupancyRate, occupants: s.totalOccupants, capacity: s.totalCapacity }))
  };
}

const parseMonths = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 24 ? n : 6;
};

// GET financial report (admin only)
router.get('/financial', protect, authorize('admin'), async (req, res) => {
  try {
    await recordSnapshot(); // make sure today's occupancy is included
    res.json(await buildReport(parseMonths(req.query.months)));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DOWNLOAD the monthly report as CSV (admin only)
router.get('/financial/export', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await buildReport(parseMonths(req.query.months));
    const lines = ['Month,Billed,Revenue (collected),Expenses,Net'];
    report.monthly.forEach((r) => lines.push(`${r.month},${r.billed},${r.revenue},${r.expenses},${r.net}`));
    lines.push(`Total,,${report.totals.revenue},${report.totals.expenses},${report.totals.net}`);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
