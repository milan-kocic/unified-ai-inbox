const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { createMessageWithContact } = require('../utils/messageHelper');
const router = express.Router();
const prisma = new PrismaClient();

router.post('/viber', async (req, res) => {
  try {
    const { event, message, sender, user_id } = req.body;
    if (event !== 'message' || !message) return res.status(200).send('OK');

    const token = req.headers['x-viber-auth-token'];
    const user = await prisma.user.findFirst({ where: { viberToken: token } });
    if (!user) return res.status(200).send('OK');

    const fromAddress = user_id || sender?.id;
    const fromName = sender?.name || 'Viber';
    const body = message.text || '';
    const externalId = `viber-${fromAddress}-${Date.now()}`;

    const existing = await prisma.message.findUnique({ where: { externalId } });
    if (existing) return res.status(200).send('OK');

    let contact = await prisma.contact.findUnique({
      where: { userId_address_source: { userId: user.id, address: fromAddress, source: 'viber' } }
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { userId: user.id, name: fromName, address: fromAddress, source: 'viber' }
      });
    }

    const newMsg = await createMessageWithContact(prisma, {
      source: 'viber',
      externalId,
      fromName,
      fromAddress,
      body,
      receivedAt: new Date(),
      contactId: contact.id,
      userId: user.id
    });

    if (global.io) global.io.emit('message:new', newMsg);
    res.status(200).send('OK');
  } catch (e) {
    console.error(e);
    res.status(200).send('OK');
  }
});

module.exports = router;
