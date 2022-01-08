const { FulfillmentError } = require('monochrome-bot');
const updateDbFromUser = require('../discord/db_helpers/update_from_user.js');

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
      throw new FulfillmentError({
        publicMessage: 'Say \'!blacklist [userId] [reason]\' to blacklist a user.',
        logDescription: 'Invalid syntax',
      });
    }

    const [userId, ...reasonArr] = suffix.split(' ');
    const reason = reasonArr.join(' ');

    const blacklist = monochrome.getBlacklist();
    await blacklist.blacklistUser(userId, reason);

    const user = await monochrome.updateUserFromREST(userId);
    await updateDbFromUser(user, { banReason: reason });

    return msg.channel.createMessage('The user was blacklisted');
  },
};
