const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { encrypt, decrypt, maskToken } = require('../utils/encryption');
const { callAI, getModelsForProvider } = require('../services/ai');
const { getAuthUrl, handleCallback } = require('../services/gmail');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({
      aiProvider: user.aiProvider,
      aiModel: user.aiModel,
      aiMode: user.aiMode,
      aiApiKey: maskToken(user.aiApiKey ? decrypt(user.aiApiKey) : ''),
      aiCustomName: user.aiCustomName,
      aiCustomUrl: user.aiCustomUrl,
      aiCustomFormat: user.aiCustomFormat,
      aiCustomHeaders: user.aiCustomHeaders,
      aiCustomPrompt: user.aiCustomPrompt,
      gmailConnected: !!user.gmailToken,
      slackConnected: !!user.slackToken,
      viberConnected: !!user.viberToken
    });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

// Gmail
router.post('/gmail/connect', authMiddleware, async (req, res) => {
  try {
    const url = getAuthUrl(req.user.id);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

// WhatsApp
router.post('/whatsapp/start', authMiddleware, async (req, res) => {
  res.json({ ok: true });
});

// Viber
router.post('/viber/token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    await prisma.user.update({ where: { id: req.user.id }, data: { viberToken: token } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

// Slack
router.post('/slack/connect', authMiddleware, async (req, res) => {
  try {
    const { botToken, appToken } = req.body;
    const { initSlack } = require('../services/slack');
    await prisma.user.update({ where: { id: req.user.id }, data: { slackBotToken: encrypt(botToken), slackAppToken: encrypt(appToken) } });
    initSlack(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

// AI Config
router.post('/ai/config', authMiddleware, async (req, res) => {
  try {
    const { provider, model, apiKey, mode, customName, customUrl, customFormat, customHeaders, customPrompt } = req.body;
    const data = {
      aiProvider: provider,
      aiModel: model,
      aiMode: mode || 'auto',
      aiApiKey: apiKey ? encrypt(apiKey) : undefined,
      aiCustomName: customName,
      aiCustomUrl: customUrl,
      aiCustomFormat: customFormat,
      aiCustomHeaders: customHeaders,
      aiCustomPrompt: customPrompt
    };
    await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.post('/ai/test', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.aiProvider) {
      return res.json({ ok: false, error: 'AI provajder nije izabran. Idite u podešavanja i izaberite provajdera.' });
    }
    const key = user.aiApiKey ? decrypt(user.aiApiKey) : '';
    if (!key && user.aiProvider !== 'ollama') {
      return res.json({ ok: false, error: 'API ključ nije unet. Unesite ključ u AI podešavanjima.' });
    }
    const start = Date.now();
    const result = await callAI({
      provider: user.aiProvider,
      apiKey: key,
      model: user.aiModel,
      systemPrompt: 'Ti si pomoćnik.',
      userMessage: 'Reci "AI radi!" na srpskom.',
      maxTokens: 50,
      customConfig: {
        url: user.aiCustomUrl,
        format: user.aiCustomFormat,
        headers: user.aiCustomHeaders
      }
    });
    const ms = Date.now() - start;
    if (result.success) {
      res.json({ ok: true, ms, text: result.text });
    } else {
      res.json({ ok: false, error: result.error });
    }
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.get('/ai/models/:provider', authMiddleware, async (req, res) => {
  res.json({ models: getModelsForProvider(req.params.provider) || [] });
});

module.exports = router;
