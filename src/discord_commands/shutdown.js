module.exports = {
  commandAliases: ['shutdown'],
  canBeChannelRestricted: false,
  botAdminOnly: true,
  uniqueId: 'shutdown',
  action: async function action(bot, msg) {
    await msg.channel.createMessage('Shutting down!');
    process.exit(0);
  },
};
