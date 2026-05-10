const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const logs = await prisma.aiUsageLog.findMany({
      where: { userId: req.user.id, createdAt: { gte: startOfMonth } }
    });
    const stats = {
      requests: logs.length,
      tokens: logs.reduce((a, b) => a + b.tokens, 0),
      byType: {}
    };
    for (const log of logs) {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    }
    const total = logs.length || 1;
    stats.breakdown = {
      summary: Math.round(((stats.byType.summary || 0) / total) * 100),
      reply: Math.round(((stats.byType.reply || 0) / total) * 100),
      chat: Math.round(((stats.byType.chat || 0) / total) * 100),
      contact: Math.round(((stats.byType.contact || 0) / total) * 100)
    };
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.post('/usage/reset', authMiddleware, async (req, res) => {
  try {
    await prisma.aiUsageLog.deleteMany({ where: { userId: req.user.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

module.exports = router;
