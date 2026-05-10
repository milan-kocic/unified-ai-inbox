require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.FRONTEND_URL || '*' } });
global.io = io;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/slack', require('./routes/slack'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redis = require('ioredis');
    const redisClient = new redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redisClient.ping();
    redisClient.disconnect();
    res.json({ status: 'ok', db: 'connected', redis: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected', redis: 'disconnected' });
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Auto backup
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 2 * * *', () => {
    const { exec } = require('child_process');
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    exec(`docker exec unified-inbox-postgres pg_dump -U inbox inbox > backups/backup-${ts}.sql`);
  });
}

// Init WhatsApp
const { initWhatsApp } = require('./services/whatsapp');
initWhatsApp().catch(() => {});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend pokrenut na portu ${PORT}`);
});
