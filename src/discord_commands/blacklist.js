const PublicError = require('monochrome-bot').PublicError;

/**
* Blacklist a user with a reason
* Syntax: bot!blacklist [userId] [reason]
*/
module.exports = {
  commandAliases: ['blacklist'],
  botAdminOnly: true,
  uniqueId: 'blacklist',
  shortDescription: 'Blacklist a user.',
  usageExample: '<prefix>blacklist 52634605505 Abuse of bot features',
  action: async function action(bot, msg, suffix, monochrome) {
    if (!suffix || suffix.indexOf(' ') === -1) {
      throw PublicError.createWithCustomPublicMessage('Say \'!blacklist [userId] [reason]\' to blacklist a user.', false, 'Invalid syntax');
    }
    let spaceIndex = suffix.indexOf(' ');
    let userId = suffix.substring(0, spaceIndex);
    let reason = suffix.substring(spaceIndex + 1);
    let blacklist = monochrome.getBlacklist();
    await blacklist.blacklistUser(bot, userId, reason);
    return msg.channel.createMessage('The user was blacklisted');
  },
};
