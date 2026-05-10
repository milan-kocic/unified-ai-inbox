const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const { createMessageWithContact } = require('../utils/messageHelper');
const prisma = new PrismaClient();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

function getAuthUrl(userId) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send'],
    state: userId
  });
}

async function handleCallback(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

async function syncGmail(userId, days = 30) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.gmailToken) return;

  oauth2Client.setCredentials({ refresh_token: user.gmailToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const after = Math.floor((Date.now() - days * 86400000) / 1000);
  const res = await gmail.users.messages.list({ userId: 'me', q: `after:${after}` });
  const messages = res.data.messages || [];

  let processed = 0;
  for (const m of messages) {
    const existing = await prisma.message.findFirst({ where: { externalId: `gmail-${m.id}`, userId } });
    if (existing) continue;

    const detail = await gmail.users.messages.get({ userId: 'me', id: m.id });
    const headers = detail.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const fromHeader = headers.find(h => h.name === 'From')?.value || '';
    const fromMatch = fromHeader.match(/(.+?)\s*<(.+?)>/) || [null, fromHeader, fromHeader];
    const fromName = fromMatch[1]?.trim() || fromHeader;
    const fromAddress = fromMatch[2]?.trim() || fromHeader;

    let body = '';
    const parts = detail.data.payload.parts || [detail.data.payload];
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf8');
        break;
      }
    }

    let contact = await prisma.contact.findUnique({
      where: { userId_address_source: { userId, address: fromAddress, source: 'email' } }
    });
    if (!contact) {
      contact = await prisma.contact.create({ data: { userId, name: fromName, address: fromAddress, source: 'email' } });
    }

    const newMsg = await createMessageWithContact(prisma, {
      source: 'email',
      externalId: `gmail-${m.id}`,
      fromName,
      fromAddress,
      subject,
      body: body.slice(0, 10000),
      receivedAt: new Date(parseInt(detail.data.internalDate)),
      contactId: contact.id,
      userId
    });

    if (global.io) global.io.emit('message:new', newMsg);
    processed++;
    if (processed % 50 === 0) {
      if (global.io) global.io.emit('sync:complete', { source: 'gmail', processed, total: messages.length });
    }
  }
}

async function sendGmailReply(user, originalMessage, replyText) {
  oauth2Client.setCredentials({ refresh_token: user.gmailToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const raw = Buffer.from(
    `To: ${originalMessage.fromAddress}\r\n` +
    `Subject: Re: ${originalMessage.subject || ''}\r\n` +
    `In-Reply-To: ${originalMessage.externalId.replace('gmail-', '')}\r\n` +
    `References: ${originalMessage.externalId.replace('gmail-', '')}\r\n\r\n` +
    `${replyText}`
  ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

module.exports = { getAuthUrl, handleCallback, syncGmail, sendGmailReply };
