const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getQR, getStatus } = require('../services/whatsapp');
const router = express.Router();

router.get('/qr', authMiddleware, async (req, res) => {
  const qr = getQR();
  if (qr) {
    const QRCode = require('qrcode');
    const dataUrl = await QRCode.toDataURL(qr);
    res.json({ qr: dataUrl });
  } else {
    res.json({ qr: null });
  }
});

router.get('/status', authMiddleware, async (req, res) => {
  res.json(getStatus());
});

module.exports = router;
