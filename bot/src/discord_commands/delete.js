const { FulfillmentError } = require('monochrome-bot');

/**
* Delete a message (if the bot has moderator powers it can delete the messages of others.
* If not it can only delete its own messages).
* This isn't meant for moderation.
* Just if you mess up when using the }broadcast command, you can use this to delete the message.
* Of course if you are a server admin you can just delete the message yourself.
* Syntax: }delete [channel_id] [message_id]
*/
module.exports = {
  commandAliases: ['delete'],
  botAdminOnly: true,
  shortDescription: 'Delete a message.',
  usageExample: '}setavatar [channelId] [messageId]',
  hidden: true,
  uniqueId: 'delete',
  action(bot, msg, suffix) {
    if (!suffix || suffix.indexOf(' ') === -1) {
      throw new FulfillmentError({
        publicMessage: 'Say \'}delete [channel_id] [message_id]\' to delete a message.',
        logDescription: 'No suffix',
      });
    }
    const parts = suffix.split(' ');
    return bot.deleteMessage(parts[0], parts[1]);
  },
};
