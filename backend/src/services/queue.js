const Queue = require('bull');
const { callAI } = require('./ai');
const { buildContactContext, buildSystemPrompt } = require('./contactContext');
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('../utils/encryption');
const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

const aiQueue = new Queue('ai-processing', redisUrl, {
  defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 5000 } }
});

const syncQueue = new Queue('sync-processing', redisUrl, {
  defaultJobOptions: { attempts: 3, backoff: { type: 'fixed', delay: 10000 } }
});

aiQueue.process('summary', 3, async (job) => {
  const { messageId } = job.data;
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { contact: true, user: true } });
  if (!message || !message.user.aiProvider) return;

  const contactCtx = message.contact ? await buildContactContext(message.contact.id, message.body) : { summary: '', recentMessages: [], relevantOld: [] };
  const systemPrompt = buildSystemPrompt(contactCtx, message.body);

  const result = await callAI({
    provider: message.user.aiProvider,
    apiKey: message.user.aiApiKey ? decrypt(message.user.aiApiKey) : '',
    model: message.user.aiModel,
    systemPrompt,
    userMessage: 'Napravi kratak sažetak ove poruke u 1-2 rečenice.',
    maxTokens: 150
  });

  if (result.success) {
    await prisma.message.update({ where: { id: messageId }, data: { aiSummary: result.text } });
    await logUsage(message.userId, 'summary', message.user.aiProvider, message.user.aiModel, result.tokensUsed);
    if (global.io) global.io.emit('message:ai-ready', { messageId, type: 'summary' });
  }
});

aiQueue.process('reply-suggestion', 3, async (job) => {
  const { messageId } = job.data;
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { contact: true, user: true } });
  if (!message || !message.user.aiProvider) return;

  const contactCtx = message.contact ? await buildContactContext(message.contact.id, message.body) : { summary: '', recentMessages: [], relevantOld: [] };
  const systemPrompt = buildSystemPrompt(contactCtx, message.body);

  const result = await callAI({
    provider: message.user.aiProvider,
    apiKey: message.user.aiApiKey ? decrypt(message.user.aiApiKey) : '',
    model: message.user.aiModel,
    systemPrompt,
    userMessage: 'Predloži odgovor na ovu poruku na srpskom jeziku.',
    maxTokens: 300
  });

  if (result.success) {
    await prisma.message.update({ where: { id: messageId }, data: { aiReply: result.text } });
    await logUsage(message.userId, 'reply', message.user.aiProvider, message.user.aiModel, result.tokensUsed);
    if (global.io) global.io.emit('message:ai-ready', { messageId, type: 'reply' });
  }
});

aiQueue.process('contact-summary', 2, async (job) => {
  const { contactId } = job.data;
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, include: { user: true } });
  if (!contact || !contact.user.aiProvider) return;

  const messages = await prisma.message.findMany({
    where: { contactId, isDeleted: false },
    orderBy: { receivedAt: 'desc' },
    take: 10
  });
  if (messages.length === 0) return;

  const lines = messages.map(m => `${m.fromName}: ${m.body.slice(0, 200)}`).join('\n');
  const result = await callAI({
    provider: contact.user.aiProvider,
    apiKey: contact.user.aiApiKey ? decrypt(contact.user.aiApiKey) : '',
    model: contact.user.aiModel,
    systemPrompt: 'Ti si asistent koji ažurira profile klijenata.',
    userMessage: `Ažuriraj profil klijenta. Max 150 reči.\nFokus: tip klijenta, ton komunikacije, otvorene teme, preferencije.\nVrati SAMO tekst profila.\n\nPoruke:\n${lines}`,
    maxTokens: 200
  });

  if (result.success) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { aiSummary: result.text, aiSummaryUpdatedAt: new Date() }
    });
    await logUsage(contact.userId, 'contact', contact.user.aiProvider, contact.user.aiModel, result.tokensUsed);
  }
});

aiQueue.process('chat', 3, async (job) => {
  const { messageId, userMessage, history } = job.data;
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { contact: true, user: true, chatHistory: true } });
  if (!message || !message.user.aiProvider) return;

  const contactCtx = message.contact ? await buildContactContext(message.contact.id, message.body) : { summary: '', recentMessages: [], relevantOld: [] };
  const systemPrompt = buildSystemPrompt(contactCtx, message.body);
  const convHistory = history || message.chatHistory.map(h => ({ role: h.role, content: h.content }));

  const result = await callAI({
    provider: message.user.aiProvider,
    apiKey: message.user.aiApiKey ? decrypt(message.user.aiApiKey) : '',
    model: message.user.aiModel,
    systemPrompt,
    userMessage,
    conversationHistory: convHistory,
    maxTokens: 500
  });

  if (result.success) {
    await prisma.chatMessage.create({
      data: { messageId, role: 'assistant', content: result.text }
    });
    await logUsage(message.userId, 'chat', message.user.aiProvider, message.user.aiModel, result.tokensUsed);
    if (global.io) global.io.emit('message:ai-ready', { messageId, type: 'chat' });
  }
});

async function logUsage(userId, type, provider, model, tokens) {
  await prisma.aiUsageLog.create({
    data: { userId, type, provider: provider || 'unknown', model: model || 'unknown', tokens: tokens || 0 }
  });
}

module.exports = { aiQueue, syncQueue, logUsage };
