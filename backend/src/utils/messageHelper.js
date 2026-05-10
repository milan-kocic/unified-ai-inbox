async function createMessageWithContact(prisma, data) {
  const message = await prisma.message.create({ data });
  if (data.contactId) {
    await prisma.contact.update({
      where: { id: data.contactId },
      data: {
        messageCount: { increment: 1 },
        lastSeen: new Date(),
        lastMessagesCache: JSON.stringify({
          id: message.id,
          body: message.body,
          receivedAt: message.receivedAt,
        }),
      },
    });
  }
  return message;
}

module.exports = { createMessageWithContact };
