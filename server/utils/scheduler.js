const Bill = require('../models/Bill');
const billingRoutes = require('../routes/billingRoutes');
const { notify } = require('./notify');
const { recordSnapshot } = require('./snapshot');
const { saveBackup, listBackups } = require('./backup');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Marks late bills overdue (adding the late fee once) and warns residents
// whose bill is due within 3 days. Runs without anyone opening the page.
async function billingJob() {
  try {
    const bills = await Bill.find({ status: { $ne: 'paid' } });
    const soon = new Date(Date.now() + 3 * DAY);

    for (const bill of bills) {
      await billingRoutes.refreshOverdue(bill);

      const hasPlan = bill.installments && bill.installments.length > 0;
      if (!hasPlan && bill.status === 'unpaid' && !bill.reminderSent && bill.dueDate && bill.dueDate <= soon) {
        bill.reminderSent = true;
        await bill.save();
        await notify(
          bill.residentId,
          `Reminder: your bill for ${bill.month} of ₹${bill.totalAmount} is due on ${new Date(bill.dueDate).toLocaleDateString('en-IN')}.`,
          'billing'
        );
      }
    }
  } catch (err) {
    console.error('Billing job error:', err.message);
  }
}

// Saves a server-side backup if the newest one is older than a day
async function backupJob() {
  try {
    const latest = listBackups()[0];
    if (!latest || Date.now() - new Date(latest.createdAt).getTime() > DAY) {
      const result = await saveBackup();
      console.log(`💾 Backup saved: ${result.name}`);
    }
  } catch (err) {
    console.error('Backup job error:', err.message);
  }
}

// Call once after MongoDB is connected
function startScheduler() {
  const run = async () => {
    await billingJob();
    await recordSnapshot();
    await backupJob();
  };
  run();
  setInterval(run, HOUR);
  console.log('⏰ Scheduler started (billing checks, occupancy snapshots, daily backup)');
}

module.exports = { startScheduler };
