'use strict'
const PublicError = require('monochrome-bot').PublicError;

module.exports = {
  commandAliases: ['reload'],
  canBeChannelRestricted: false,
  botAdminOnly: true,
  uniqueId: 'reload',
  action(bot, msg, suffix, monochrome) {
    try {
      monochrome.reload();
      return msg.channel.createMessage('Reloaded!');
    } catch (err) {
      let errorMessage = 'There was an unhandled error while reloading. Monochrome will continue to run, but may be in a bad state. You should restart it as soon as possible. Check the logs for more details.';
      throw PublicError.createWithCustomPublicMessage(errorMessage, false, undefined, err);
    }
  }
};
