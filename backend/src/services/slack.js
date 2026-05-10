const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('../utils/encryption');
const { createMessageWithContact } = require('../utils/messageHelper');
const prisma = new PrismaClient();

const slackApps = new Map();

async function initSlack(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.slackBotToken || !user.slackAppToken) return;

  const botToken = decrypt(user.slackBotToken);
  const appToken = decrypt(user.slackAppToken);

  const app = new App({
    token: botToken,
    appToken: appToken,
    socketMode: true
  });

  app.message(async ({ message, client }) => {
    if (message.subtype) return;
    const fromAddress = message.user;
    const externalId = `slack-${message.ts}`;

    const existing = await prisma.message.findUnique({ where: { externalId } });
    if (existing) return;

    let fromName = 'Slack User';
    try {
      const userInfo = await client.users.info({ user: fromAddress });
      fromName = userInfo.user?.real_name || userInfo.user?.name || 'Slack User';
    } catch (e) {}

    const channelName = message.channel_type === 'im' ? 'DM' : message.channel;
    const body = message.text || '';

    let contact = await prisma.contact.findUnique({
      where: { userId_address_source: { userId, address: fromAddress, source: 'slack' } }
    });
    if (!contact) {
      contact = await prisma.contact.create({ data: { userId, name: fromName, address: fromAddress, source: 'slack' } });
    }

    const newMsg = await createMessageWithContact(prisma, {
      source: 'slack',
      externalId,
      fromName,
      fromAddress,
      subject: channelName,
      body,
      receivedAt: new Date(parseFloat(message.ts) * 1000),
      contactId: contact.id,
      userId
    });

    if (global.io) global.io.emit('message:new', newMsg);
  });

  await app.start();
  slackApps.set(userId, { app, web: new WebClient(botToken) });

  if (global.io) global.io.emit('slack:status', { userId, ready: true });
}

async function sendSlackReply(externalId, text, fromAddress) {
  const parts = externalId.split('-');
  const ts = parts[1];
  const user = await prisma.user.findFirst({ where: { slackBotToken: { not: null } } });
  if (!user) throw new Error('Nema korisnika');
  const slack = slackApps.get(user.id);
  if (!slack) throw new Error('Slack nije povezan');
  await slack.web.chat.postMessage({
    channel: fromAddress,
    text,
    thread_ts: ts
  });
}

async function importSlackHistory(userId, days = 30, types = ['dm']) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.slackBotToken) return;
  const web = new WebClient(decrypt(user.slackBotToken));

  const oldest = ((Date.now() - days * 86400000) / 1000).toString();
  let processed = 0;

  if (types.includes('dm') || types.includes('all')) {
    const convs = await web.conversations.list({ types: 'im' });
    for (const ch of (convs.channels || [])) {
      const msgs = await web.conversations.history({ channel: ch.id, oldest, limit: 200 });
      for (const m of (msgs.messages || [])) {
        if (m.subtype) continue;
        const externalId = `slack-${m.ts}`;
        const existing = await prisma.message.findUnique({ where: { externalId } });
        if (existing) continue;
        // ...save message
        processed++;
      }
    }
  }

  if (global.io) global.io.emit('sync:complete', { source: 'slack', processed });
}

module.exports = { initSlack, sendSlackReply, importSlackHistory, slackApps };
