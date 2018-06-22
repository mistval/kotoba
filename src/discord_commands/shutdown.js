'use strict'
const reload = require('require-reload')(require);
const PublicError = require('monochrome-bot').PublicError;

module.exports = {
  commandAliases: ['shutdown'],
  canBeChannelRestricted: false,
  botAdminOnly: true,
  uniqueId: 'shutdown',
  action: async function action(bot, msg) {
    await msg.channel.createMessage('Shutting down!');
    bot.disconnect();
    process.exit(0);
  },
};
