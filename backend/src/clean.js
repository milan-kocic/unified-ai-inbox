const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.chatMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.contact.deleteMany();
  console.log('Obrisano');
  await prisma.$disconnect();
}
clean();
