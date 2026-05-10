const { Client, LocalAuth } = require('whatsapp-web.js');
const { PrismaClient } = require('@prisma/client');
const { createMessageWithContact } = require('../utils/messageHelper');
const prisma = new PrismaClient();

let qrCode = null;
let ready = false;
let client = null;

async function initWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });

  client.on('qr', (qr) => {
    qrCode = qr;
    ready = false;
    if (global.io) global.io.emit('whatsapp:qr', qr);
  });

  client.on('ready', () => {
    qrCode = null;
    ready = true;
    if (global.io) global.io.emit('whatsapp:status', { ready: true });
    console.log('WhatsApp spreman');
  });

  client.on('message', async (msg) => {
    try {
      const fromAddress = msg.from;
      const fromName = msg._data?.notifyName || fromAddress;
      const body = msg.body || '';
      const externalId = `wa-${msg.id.id}`;

      const existing = await prisma.message.findUnique({ where: { externalId } });
      if (existing) return;

      const users = await prisma.user.findMany();
      for (const user of users) {
        let contact = await prisma.contact.findUnique({
          where: { userId_address_source: { userId: user.id, address: fromAddress, source: 'whatsapp' } }
        });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { userId: user.id, name: fromName, address: fromAddress, source: 'whatsapp' }
          });
        }

        const newMsg = await createMessageWithContact(prisma, {
          source: 'whatsapp',
          externalId,
          fromName,
          fromAddress,
          body,
          receivedAt: new Date(),
          contactId: contact.id,
          userId: user.id
        });

        if (global.io) global.io.emit('message:new', newMsg);
      }
    } catch (e) {
      console.error('WhatsApp message error:', e);
    }
  });

  client.initialize().catch(() => {});
}

function getQR() {
  return qrCode;
}

function getStatus() {
  return { ready, qr: !!qrCode };
}

async function sendWhatsAppReply(to, text) {
  if (!client || !ready) throw new Error('WhatsApp nije spreman');
  await client.sendMessage(to, text);
}

module.exports = { initWhatsApp, getQR, getStatus, sendWhatsAppReply };
