module.exports = {
  commandAliases: ['shutdown'],
  canBeChannelRestricted: false,
  botAdminOnly: true,
  uniqueId: 'shutdown',
  async action(bot, msg) {
    await msg.channel.createMessage('Shutting down!');
    process.exit(0);
  },
};
