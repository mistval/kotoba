const constants = require('../common/constants.js');
const updateDbFromUser = require('../discord/db_helpers/update_from_user.js');

module.exports = {
  commandAliases: ['banme'],
  shortDescription: 'Delete all data that I have stored for you.',
  uniqueId: 'banme',
  hidden: true,
  async action(bot, msg, suffix, monochrome) {
    await msg.channel.createMessage({
      embeds: [{
        title: '⚠️ Ban Self ⚠️',
        description: 'You are about to ban yourself from using me. I will completely ignore any messages you send and leave any servers you own. If you are sure you want to do this, say **confirm**. To cancel, say anything else.',
        color: constants.EMBED_WARNING_COLOR,
      }],
    });

    let responseMsg;
    try {
      responseMsg = await monochrome.waitForMessage(
        120000,
        (c) => c.author.id === msg.author.id && c.channel.id === msg.channel.id,
      );
    } catch (err) {
      if (err.message === 'WAITER TIMEOUT') {
        return msg.channel.createMessage('You did not respond. Operation canceled.');
      }

      throw err;
    }

    const response = responseMsg.content.toLowerCase().trim();

    if (response !== 'confirm') {
      return msg.channel.createMessage('You did not say **confirm**, so you have **not** been banned.');
    }

    const blacklist = monochrome.getBlacklist();
    await blacklist.blacklistUser(msg.author.id, 'User requested to be blacklisted.');

    const user = await monochrome.updateUserFromREST(msg.author.id);
    await updateDbFromUser(user, { banReason: 'User requested to be banned.' });

    return msg.channel.createMessage('Okay, we are officially over!');
  },
};
