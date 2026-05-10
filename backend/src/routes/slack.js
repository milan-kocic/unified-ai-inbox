const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const { PrismaClient } = require('@prisma/client');
const { initSlack } = require('../services/slack');
const router = express.Router();
const prisma = new PrismaClient();

router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { botToken, appToken, settings } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        slackBotToken: encrypt(botToken),
        slackAppToken: encrypt(appToken),
        slackSettings: JSON.stringify(settings || {})
      }
    });
    await initSlack(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ connected: !!user.slackBotToken });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { slackToken: null, slackBotToken: null, slackAppToken: null, slackTeamId: null, slackSettings: null }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

module.exports = router;
