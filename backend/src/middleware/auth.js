const { verify } = require('../utils/jwt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nema tokena' });
  }
  const token = header.slice(7);
  try {
    const decoded = verify(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'Korisnik ne postoji' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Nevalidan token' });
  }
}

module.exports = { authMiddleware };
