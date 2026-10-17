const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Room = require('../models/Room');
const Bill = require('../models/Bill');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Notification = require('../models/Notification');
const Expense = require('../models/Expense');
const OccupancySnapshot = require('../models/OccupancySnapshot');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const KEEP_LAST = 7;

// Collects every collection into one plain object. Password hashes are never included.
async function buildBackup() {
  const [users, rooms, bills, maintenance, notifications, expenses, snapshots] = await Promise.all([
    User.find().select('-password').lean(),
    Room.find().lean(),
    Bill.find().lean(),
    MaintenanceRequest.find().lean(),
    Notification.find().lean(),
    Expense.find().lean(),
    OccupancySnapshot.find().lean()
  ]);

  return {
    meta: {
      createdAt: new Date().toISOString(),
      app: 'hostel-management-system',
      counts: {
        users: users.length, rooms: rooms.length, bills: bills.length, maintenance: maintenance.length,
        notifications: notifications.length, expenses: expenses.length, snapshots: snapshots.length
      }
    },
    users, rooms, bills, maintenance, notifications, expenses, snapshots
  };
}

// Writes a backup file to server/backups and keeps only the newest few
async function saveBackup() {
  const data = await buildBackup();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const name = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(BACKUP_DIR, name), JSON.stringify(data, null, 2));

  const files = listBackups();
  files.slice(KEEP_LAST).forEach((f) => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f.name)); } catch (e) { /* ignore */ }
  });
  return { name, counts: data.meta.counts };
}

// Newest first
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = { buildBackup, saveBackup, listBackups };
