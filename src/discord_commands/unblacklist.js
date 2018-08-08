const PublicError = require('monochrome-bot').PublicError;

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
  action: async function action(bot, msg, suffix, monochrome) {
    if (!suffix ) {
      throw PublicError.createWithCustomPublicMessage('Say \'!unblacklist [userId]\' to unblacklist a user.', false, 'Invalid syntax');
    }
    let userId = suffix;
    let blacklist = monochrome.getBlacklist();
    await blacklist.unblacklistUser(bot, userId);
    return msg.channel.createMessage('The user was unblacklisted');
  },
};
