const { FulfillmentError } = require('monochrome-bot');

module.exports = {
  commandAliases: ['reload'],
  canBeChannelRestricted: false,
  botAdminOnly: true,
  uniqueId: 'reload',
  hidden: true,
  action(bot, msg, suffix, monochrome) {
    try {
      monochrome.reload();
      return msg.channel.createMessage('Reloaded!');
    } catch (err) {
      const errorMessage = 'There was an unhandled error while reloading. Monochrome will continue to run, but may be in a bad state. You should restart it as soon as possible. Check the logs for more details.';
      throw new FulfillmentError({
        publicMessage: errorMessage,
        error: err,
      });
    }
  },
};
