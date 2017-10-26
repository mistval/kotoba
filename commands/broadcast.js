'use strict'
/**
* Send a message as the bot.
* Syntax: }broadcast [channel_id] [announcement]
*/
module.exports = {
  commandAliases: ['}broadcast', '}b'],
  botAdminOnly: true,
  action(bot, msg, suffix) {
    if (!suffix || suffix.indexOf(' ') === -1) {
      msg.channel.createMessage('Say \'}broadcast [channel_id] [announcement]\' to broadcast  a message');
      return 'invalid syntax';
    }
    let spaceIndex = suffix.indexOf(' ');
    let channelId = suffix.substring(0, spaceIndex);
    let announcement = suffix.substring(spaceIndex + 1);
    return bot.createMessage(channelId, announcement);
  },
};
