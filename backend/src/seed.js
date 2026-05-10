const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createMessageWithContact } = require('./utils/messageHelper');

const prisma = new PrismaClient();

async function main() {
  // 1. Kreiraj test korisnika ako ne postoji
  let user = await prisma.user.findUnique({ where: { email: 'test@test.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        passwordHash: await bcrypt.hash('test123456', 10),
      },
    });
    console.log('Kreiran korisnik:', user.email);
  } else {
    console.log('Korisnik već postoji:', user.email);
  }

  // 2. Kreiraj 5 test kontakata
  const contactsData = [
    { name: 'Petar Petrović', address: 'petar@example.com', source: 'email' },
    { name: 'Ana Anić', address: '+38164123456', source: 'whatsapp' },
    { name: 'Marko Marković', address: '+38165123456', source: 'whatsapp' },
    { name: 'Jovan Jovanović', address: 'jovan@viber', source: 'viber' },
    { name: 'Slack Bot', address: 'slack-user-1', source: 'slack' },
  ];

  const contacts = [];
  for (const c of contactsData) {
    let contact = await prisma.contact.findUnique({
      where: { userId_address_source: { userId: user.id, address: c.address, source: c.source } },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          userId: user.id,
          name: c.name,
          address: c.address,
          source: c.source,
        },
      });
      console.log('Kreiran kontakt:', contact.name);
    } else {
      console.log('Kontakt već postoji:', contact.name);
    }
    contacts.push(contact);
  }

  // 3. Kreiraj 15 test poruka sa priority
  const now = new Date();
  const messagesData = [
    // Email (5)
    { source: 'email', externalId: 'email-1', fromName: 'Petar Petrović', fromAddress: 'petar@example.com', subject: 'Ponuda za saradnju', body: 'Poštovani, imamo odličnu ponudu za vas...', isRead: true, priority: 'high', aiSummary: 'Petar šalje ponudu za saradnju na novom projektu.', aiReply: 'Poštovani Petre,\n\nHvala na ponudi. Pregledaću je detaljno i javiti Vam se sa povratnim informacijama do kraja nedelje.\n\nS poštovanjem', contact: contacts[0] },
    { source: 'email', externalId: 'email-2', fromName: 'Petar Petrović', fromAddress: 'petar@example.com', subject: 'Re: Ponuda', body: 'Hvala na brzom odgovoru...', isRead: false, priority: 'medium', aiSummary: null, contact: contacts[0] },
    { source: 'email', externalId: 'email-3', fromName: 'Info', fromAddress: 'info@company.com', subject: 'Newsletter maj 2026', body: 'Najnovije vesti iz naše kompanije...', isRead: true, priority: 'low', aiSummary: 'Mesečni newsletter sa novostima.', contact: null },
    { source: 'email', externalId: 'email-4', fromName: 'HR Odeljenje', fromAddress: 'hr@company.com', subject: 'Poziv na razgovor', body: 'Dragi kandidate, pozivamo vas na razgovor...', isRead: false, priority: 'high', aiSummary: 'Poziv na razgovor za posao.', contact: null },
    { source: 'email', externalId: 'email-5', fromName: 'Petar Petrović', fromAddress: 'petar@example.com', subject: 'Faktura #123', body: 'U prilogu šaljemo fakturu...', isRead: true, priority: 'medium', aiSummary: 'Faktura za usluge iz prethodnog meseca.', contact: contacts[0] },
    // WhatsApp (4)
    { source: 'whatsapp', externalId: 'wa-1', fromName: 'Ana Anić', fromAddress: '+38164123456', subject: null, body: 'Hej, jesi li slobodan sutra za kafu?', isRead: true, priority: 'low', aiSummary: 'Ana pita da li ste slobodni za kafu sutra.', aiReply: 'Hej Ana! Da, slobodan sam sutra posle 14h. Gde se nalazimo?', contact: contacts[1] },
    { source: 'whatsapp', externalId: 'wa-2', fromName: 'Marko Marković', fromAddress: '+38165123456', subject: null, body: 'Dokumenti su spremni, možeš li doći po njih?', isRead: false, priority: 'high', aiSummary: null, contact: contacts[2] },
    { source: 'whatsapp', externalId: 'wa-3', fromName: 'Ana Anić', fromAddress: '+38164123456', subject: null, body: 'Hvala puno! Vidimo se u 15h.', isRead: true, priority: 'low', aiSummary: 'Ana se zahvaljuje i potvrđuje sastanak.', contact: contacts[1] },
    { source: 'whatsapp', externalId: 'wa-4', fromName: 'Marko Marković', fromAddress: '+38165123456', subject: null, body: 'OK, čujemo se kasnije.', isRead: false, priority: 'low', aiSummary: null, contact: contacts[2] },
    // Viber (3)
    { source: 'viber', externalId: 'viber-1', fromName: 'Jovan Jovanović', fromAddress: 'jovan@viber', subject: null, body: 'Zdravo, šaljem ti lokaciju za sastanak.', isRead: true, priority: 'medium', aiSummary: 'Jovan šalje lokaciju za sastanak.', aiReply: 'Hvala Jovane, vidim lokaciju. Stižem za 15 minuta.', contact: contacts[3] },
    { source: 'viber', externalId: 'viber-2', fromName: 'Jovan Jovanović', fromAddress: 'jovan@viber', subject: null, body: 'Da li si stigao?', isRead: false, priority: 'critical', aiSummary: null, contact: contacts[3] },
    { source: 'viber', externalId: 'viber-3', fromName: 'Jovan Jovanović', fromAddress: 'jovan@viber', subject: null, body: 'Odlično, vidimo se za 10 minuta.', isRead: true, priority: 'low', aiSummary: 'Jovan potvrđuje dolazak.', contact: contacts[3] },
    // Slack (3)
    { source: 'slack', externalId: 'slack-1', fromName: 'Slack Bot', fromAddress: 'slack-user-1', subject: null, body: 'Novi komentar na vaš PR.', isRead: true, priority: 'medium', aiSummary: 'Obaveštenje o novom komentaru na pull request.', contact: contacts[4] },
    { source: 'slack', externalId: 'slack-2', fromName: 'Slack Bot', fromAddress: 'slack-user-1', subject: null, body: 'Build je uspešno završen.', isRead: false, priority: 'critical', aiSummary: null, contact: contacts[4] },
    { source: 'slack', externalId: 'slack-3', fromName: 'Slack Bot', fromAddress: 'slack-user-1', subject: null, body: 'Deployment na produkciju je započet.', isRead: true, priority: 'critical', aiSummary: 'Obaveštenje o početku deploymenta.', contact: contacts[4] },
  ];

  for (let i = 0; i < messagesData.length; i++) {
    const m = messagesData[i];
    const exists = await prisma.message.findUnique({ where: { externalId: m.externalId } });
    if (!exists) {
      await createMessageWithContact(prisma, {
        source: m.source,
        externalId: m.externalId,
        fromName: m.fromName,
        fromAddress: m.fromAddress,
        subject: m.subject,
        body: m.body,
        receivedAt: new Date(now.getTime() - (messagesData.length - i) * 60000),
        isRead: m.isRead,
        aiSummary: m.aiSummary,
        aiReply: m.aiReply,
        priority: m.priority,
        userId: user.id,
        contactId: m.contact ? m.contact.id : null,
      });
      console.log('Kreirana poruka:', m.externalId, '— priority:', m.priority);
    } else {
      console.log('Poruka već postoji:', m.externalId);
    }
  }

  console.log('Seed završen!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
