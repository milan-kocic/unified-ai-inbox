const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, tag, sort = 'activity' } = req.query;
    const where = { userId: req.user.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (tag) where.tags = { contains: tag };
    const orderBy = sort === 'activity'
      ? { lastSeen: 'desc' }
      : { messageCount: 'desc' };
    const contacts = await prisma.contact.findMany({ where, orderBy, include: { _count: { select: { messages: true } } } });
    res.json(contacts);
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!contact) return res.status(404).json({ error: 'Nije pronađen' });
    res.json(contact);
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { contactId: req.params.id, userId: req.user.id, isDeleted: false },
      orderBy: { receivedAt: 'desc' }
    });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.get('/:id/conversation', authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { contactId: req.params.id, userId: req.user.id, isDeleted: false },
      include: { chatHistory: { orderBy: { createdAt: 'asc' } } },
      orderBy: { receivedAt: 'asc' }
    });

    const conversation = [];
    for (const msg of messages) {
      conversation.push({
        type: 'received',
        id: msg.id,
        content: msg.body,
        subject: msg.subject,
        source: msg.source,
        createdAt: msg.receivedAt,
        aiSummary: msg.aiSummary,
        aiReply: msg.aiReply,
        fromName: msg.fromName
      });
      for (const chat of msg.chatHistory) {
        conversation.push({
          type: chat.role === 'user' ? 'sent' : 'ai',
          id: chat.id,
          content: chat.content,
          createdAt: chat.createdAt
        });
      }
    }
    conversation.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(conversation);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Greška' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { notes, tags } = req.body;
    const contact = await prisma.contact.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { notes, tags }
    });
    res.json(contact);
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.contact.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

module.exports = router;
