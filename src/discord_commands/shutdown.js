'use strict'
const reload = require('require-reload')(require);
const PublicError = require('monochrome-bot').PublicError;

function delay() {
  return new Promise((fulfill, reject) => {
    setTimeout(fulfill, 2000);
  });
}

module.exports = {
  commandAliases: ['shutdown'],
  canBeChannelRestricted: false,
  botAdminOnly: true,
  uniqueId: 'shutdown',
  action: async function action(bot, msg, suffix, monochrome) {
    await msg.channel.createMessage('Shutting down!');

    try {
      await monochrome.stop();
    } catch (err) {
      console.warn('Error stopping');
      console.warn(err);
    }

    await delay();
    process.exit(0);
  },
};
