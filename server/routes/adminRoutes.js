const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { buildBackup, saveBackup, listBackups } = require('../utils/backup');

const router = express.Router();

// DOWNLOAD a full JSON backup of the database (admin only)
router.get('/backup', protect, authorize('admin'), async (req, res) => {
  try {
    const data = await buildBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="hostel-backup-${stamp}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ message: 'Backup failed', error: err.message });
  }
});

// SAVE a backup file on the server now (admin only)
router.post('/backup/save', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await saveBackup();
    res.status(201).json({ message: 'Backup saved on the server', ...result });
  } catch (err) {
    res.status(500).json({ message: 'Backup failed', error: err.message });
  }
});

// LIST backups stored on the server (admin only)
router.get('/backup/list', protect, authorize('admin'), (req, res) => {
  try {
    res.json(listBackups());
  } catch (err) {
    res.status(500).json({ message: 'Could not list backups', error: err.message });
  }
});

module.exports = router;
