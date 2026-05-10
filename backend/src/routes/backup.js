const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

const BACKUP_DIR = path.join(__dirname, '../../backups');

router.get('/download', authMiddleware, (req, res) => {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql')).sort().reverse();
  if (!files.length) return res.status(404).json({ error: 'Nema backup-a' });
  const latest = path.join(BACKUP_DIR, files[0]);
  res.download(latest, files[0]);
});

router.get('/info', authMiddleware, (req, res) => {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql')).sort().reverse();
  if (!files.length) return res.json({ latest: null });
  const latest = path.join(BACKUP_DIR, files[0]);
  const stat = fs.statSync(latest);
  res.json({ latest: { name: files[0], date: stat.mtime, size: stat.size } });
});

router.post('/restore', authMiddleware, (req, res) => {
  res.status(501).json({ error: 'Ručni restore: docker exec -i unified-inbox-postgres psql -U inbox inbox < backup.sql' });
});

module.exports = router;
