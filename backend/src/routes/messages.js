const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { aiQueue } = require('../services/queue');
const { decrypt } = require('../utils/encryption');
const { callAI } = require('../services/ai');
const { buildContactContext, buildSystemPrompt } = require('../services/contactContext');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { source, unread, page = '1' } = req.query;
    const where = { userId: req.user.id, isDeleted: false };
    if (source) where.source = source;
    if (unread === 'true') where.isRead = false;
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: { contact: true },
        orderBy: { receivedAt: 'desc' },
        skip: (parseInt(page) - 1) * 50,
        take: 50
      }),
      prisma.message.count({ where })
    ]);
    res.json({ messages, total });
  } catch (e) {
    res.status(500).json({ error: 'Greška pri učitavanju poruka' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { contact: true, chatHistory: { orderBy: { createdAt: 'asc' } } }
    });
    if (!message) return res.status(404).json({ error: 'Poruka nije pronađena' });
    res.json(message);
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    await prisma.message.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.message.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.post('/:id/summarize', authMiddleware, async (req, res) => {
  try {
    const message = await prisma.message.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { user: true } });
    if (!message) return res.status(404).json({ error: 'Nije pronađeno' });
    if (message.user.aiMode === 'manual' || !message.user.aiProvider) {
      return res.json({ queued: true });
    }
    await aiQueue.add('summary', { messageId: message.id }, { priority: 2 });
    res.json({ queued: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.post('/:id/chat', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await prisma.message.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { contact: true, user: true, chatHistory: true }
    });
    if (!message) return res.status(404).json({ error: 'Nije pronađeno' });

    await prisma.chatMessage.create({ data: { messageId: message.id, role: 'user', content } });
    const history = message.chatHistory.map(h => ({ role: h.role, content: h.content }));
    await aiQueue.add('chat', { messageId: message.id, userMessage: content, history }, { priority: 1 });
    res.json({ queued: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.post('/:id/reply', authMiddleware, async (req, res) => {
  try {
    const { replyText } = req.body;
    const message = await prisma.message.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { user: true } });
    if (!message) return res.status(404).json({ error: 'Nije pronađeno' });

    if (message.source === 'whatsapp') {
      const { sendWhatsAppReply } = require('../services/whatsapp');
      await sendWhatsAppReply(message.fromAddress, replyText);
    } else if (message.source === 'slack') {
      const { sendSlackReply } = require('../services/slack');
      await sendSlackReply(message.externalId, replyText, message.fromAddress);
    } else if (message.source === 'email') {
      const { sendGmailReply } = require('../services/gmail');
      await sendGmailReply(message.user, message, replyText);
    } else if (message.source === 'viber') {
      const { sendViberReply } = require('../services/viber');
      await sendViberReply(message.user, message.fromAddress, replyText);
    }

    await prisma.message.update({ where: { id: message.id }, data: { isReplied: true } });
    await prisma.chatMessage.create({
      data: { messageId: message.id, role: 'user', content: replyText }
    });
    res.json({ sent: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Greška pri slanju' });
  }
});

module.exports = router;
