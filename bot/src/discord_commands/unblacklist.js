const { FulfillmentError } = require('monochrome-bot');

/**
* Blacklist a user with a reason
* Syntax: bot!blacklist [userId] [reason]
*/
module.exports = {
  commandAliases: ['unblacklist'],
  botAdminOnly: true,
  uniqueId: 'unblacklist',
  shortDescription: 'Unblacklist a user.',
  usageExample: '<prefix>unblacklist 52634605505',
  hidden: true,
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      throw new FulfillmentError({
        publicMessage: 'Say \'!unblacklist [userId]\' to unblacklist a user.',
        logDescription: 'Invalid syntax',
      });
    }

    const userId = suffix;
    const blacklist = monochrome.getBlacklist();
    await blacklist.unblacklistUser(userId);
    return msg.channel.createMessage('The user was unblacklisted');
  },
};
