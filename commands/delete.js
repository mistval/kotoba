'use strict'
/**
* Delete a message (if the bot has moderator powers it can delete the messages of others. If not it can only delete its own messages).
* Syntax: }delete [channel_id] [message_id]
*/
module.exports = {
  commandAliases: ['}delete', '}d'],
  botAdminOnly: true,
  action(bot, msg, suffix) {
    if (!suffix || suffix.indexOf(' ') === -1) {
      return msg.channel.createMessage('Say \'}delete [channel_id] [message_id]\' to delete a message.');
    }
    let parts = suffix.split(' ');
    return bot.deleteMessage(parts[0], parts[1]);
  },
};
