const { PublicError } = require('monochrome-bot');

/**
* Blacklist a user with a reason
* Syntax: bot!blacklist [userId] [reason]
*/
module.exports = {
  commandAliases: ['blacklist'],
  botAdminOnly: true,
  hidden: true,
  uniqueId: 'blacklist',
  shortDescription: 'Blacklist a user.',
  usageExample: '<prefix>blacklist 52634605505 Abuse of bot features',
  async action(bot, msg, suffix, monochrome) {
    if (!suffix || suffix.indexOf(' ') === -1) {
      throw PublicError.createWithCustomPublicMessage('Say \'!blacklist [userId] [reason]\' to blacklist a user.', false, 'Invalid syntax');
    }
    const spaceIndex = suffix.indexOf(' ');
    const userId = suffix.substring(0, spaceIndex);
    const reason = suffix.substring(spaceIndex + 1);
    const blacklist = monochrome.getBlacklist();
    await blacklist.blacklistUser(bot, userId, reason);
    return msg.channel.createMessage('The user was blacklisted');
  },
};
