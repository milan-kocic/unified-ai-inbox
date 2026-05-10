const { PrismaClient } = require('@prisma/client');
const { callAI } = require('./ai');
const { decrypt } = require('../utils/encryption');
const prisma = new PrismaClient();

async function buildContactContext(contactId, currentMessageBody) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { user: true }
  });
  if (!contact) return { summary: '', recentMessages: [], relevantOld: [] };

  // Sloj 1 - Contact Summary (~100 tokena)
  let summary = contact.aiSummary || '';
  if (!summary && contact.user.aiProvider) {
    summary = await generateContactSummary(contactId);
  }

  // Sloj 2 - Poslednje 3 poruke (~500 tokena)
  const recent = await prisma.message.findMany({
    where: { contactId, isDeleted: false },
    orderBy: { receivedAt: 'desc' },
    take: 3
  });
  const recentMessages = recent.map(m => {
    const prefix = m.isReplied ? '[Odgovor]' : '[Klijent]';
    const body = m.body.slice(0, 200);
    return `[${m.receivedAt.toISOString().slice(0, 10)}] ${prefix}: ${body}`;
  }).reverse();

  // Sloj 3 - Relevantne starije (~300 tokena)
  let relevantOld = [];
  if (currentMessageBody) {
    const keywords = currentMessageBody.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const older = await prisma.message.findMany({
      where: { contactId, isDeleted: false, id: { notIn: recent.map(r => r.id) } },
      orderBy: { receivedAt: 'desc' },
      take: 20
    });
    const matched = older.filter(m => {
      const body = m.body.toLowerCase();
      return keywords.some(k => body.includes(k));
    }).slice(0, 2);
    relevantOld = matched.map(m => `[${m.receivedAt.toISOString().slice(0, 10)}] ${m.body.slice(0, 100)}`);
  }

  return { summary, recentMessages, relevantOld };
}

async function generateContactSummary(contactId) {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, include: { user: true } });
  if (!contact || !contact.user.aiProvider) return '';

  const messages = await prisma.message.findMany({
    where: { contactId, isDeleted: false },
    orderBy: { receivedAt: 'desc' },
    take: 10
  });
  if (messages.length === 0) return '';

  const lines = messages.map(m => `${m.fromName}: ${m.body.slice(0, 200)}`).join('\n');
  const prompt = `Ažuriraj profil klijenta. Max 150 reči.\nFokus: tip klijenta, ton komunikacije, otvorene teme, preferencije.\nVrati SAMO tekst profila.\n\nPoruke:\n${lines}`;

  const result = await callAI({
    provider: contact.user.aiProvider,
    apiKey: contact.user.aiApiKey ? decrypt(contact.user.aiApiKey) : '',
    model: contact.user.aiModel,
    systemPrompt: 'Ti si asistent koji ažurira profile klijenata.',
    userMessage: prompt,
    maxTokens: 200
  });

  if (result.success) {
    await prisma.contact.update({ where: { id: contactId }, data: { aiSummary: result.text, aiSummaryUpdatedAt: new Date() } });
    return result.text;
  }
  return '';
}

function buildSystemPrompt(contactContext, currentMessageBody) {
  const parts = [
    'Ti si asistent koji pomaže korisniku da upravlja poslovnim porukama.',
    'Odgovaraj uvek na srpskom jeziku.',
    '',
    'KONTEKST POŠILJAOCA:',
    contactContext.summary || 'Nema sažetka.',
    '',
    'NEDAVNA KOMUNIKACIJA:',
    contactContext.recentMessages.join('\n') || 'Nema nedavnih poruka.'
  ];
  if (contactContext.relevantOld.length > 0) {
    parts.push('', 'RELEVANTNA STARIJA KOMUNIKACIJA:', ...contactContext.relevantOld);
  }
  parts.push('', `Trenutna poruka:\n${currentMessageBody || ''}`);
  return parts.join('\n');
}

module.exports = { buildContactContext, generateContactSummary, buildSystemPrompt };
