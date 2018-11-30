const { PublicError } = require('monochrome-bot');

/**
* Send a message as the bot.
* Syntax: }broadcast [channel_id] [announcement]
*/
module.exports = {
  commandAliases: ['broadcast', 'b'],
  botAdminOnly: true,
  shortDescription: 'Send a message as me.',
  usageExample: '}broadcast [channelId] Hello!',
  hidden: true,
  uniqueId: 'broadcast',
  action(erisBot, msg, suffix) {
    if (!suffix || suffix.indexOf(' ') === -1) {
      throw PublicError.createWithCustomPublicMessage('Say \'}broadcast [channel_id] [announcement]\' to broadcast a message.', false, 'invalid syntax');
    }
    const spaceIndex = suffix.indexOf(' ');
    const channelId = suffix.substring(0, spaceIndex);
    const announcement = suffix.substring(spaceIndex + 1);
    return erisBot.createMessage(channelId, announcement);
  },
};
