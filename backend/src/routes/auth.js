const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { sign } = require('../utils/jwt');
const { encrypt } = require('../utils/encryption');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email i lozinka su obavezni' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email već postoji' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const token = sign({ userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Greška pri registraciji' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Pogrešan email ili lozinka' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Pogrešan email ili lozinka' });
    const token = sign({ userId: user.id });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Greška pri prijavljivanju' });
  }
});

router.get('/gmail', authMiddleware, async (req, res) => {
  try {
    const { getAuthUrl } = require('../services/gmail');
    const url = getAuthUrl(req.user.id);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: 'Greška' });
  }
});

router.get('/gmail/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const { handleCallback } = require('../services/gmail');
    const tokens = await handleCallback(code);
    await prisma.user.update({
      where: { id: state },
      data: { gmailToken: tokens.refresh_token || tokens.access_token }
    });
    res.redirect(`${process.env.FRONTEND_URL}/settings?gmail=ok`);
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL}/settings?gmail=error`);
  }
});

module.exports = router;
