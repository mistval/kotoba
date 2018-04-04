
const reload = require('require-reload')(require);

const PublicError = reload('monochrome-bot').PublicError;

/**
* Send a message as the bot.
* Syntax: }broadcast [channel_id] [announcement]
*/
module.exports = {
  commandAliases: ['}broadcast', '}b'],
  botAdminOnly: true,
  shortDescription: 'Send a message as me.',
  usageExample: '}broadcast [channelId] Hello!',
  action(bot, msg, suffix) {
    if (!suffix || suffix.indexOf(' ') === -1) {
      throw PublicError.createWithCustomPublicMessage('Say \'}broadcast [channel_id] [announcement]\' to broadcast a message.', false, 'invalid syntax');
    }
    const spaceIndex = suffix.indexOf(' ');
    const channelId = suffix.substring(0, spaceIndex);
    const announcement = suffix.substring(spaceIndex + 1);
    return bot.createMessage(channelId, announcement);
  },
};
