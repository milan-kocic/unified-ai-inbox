const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { syncQueue } = require('../services/queue');
const router = express.Router();

router.post('/gmail', authMiddleware, async (req, res) => {
  const { days } = req.body;
  await syncQueue.add('gmail-sync', { userId: req.user.id, days: parseInt(days) || 30 });
  res.json({ queued: true });
});

module.exports = router;
