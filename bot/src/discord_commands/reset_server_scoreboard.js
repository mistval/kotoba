const scores = require('../common/quiz/score_storage_utils.js');
const { throwPublicErrorInfo } = require('./../common/util/errors.js');
const constants = require('./../common/constants.js');

module.exports = {
  commandAliases: ['resetserverleaderboard'],
  uniqueId: 'resetserverleaderboard',
  cooldown: 2,
  shortDescription: 'Reset the server leaderboard.',
  async action(bot, msg, suffix, monochrome) {
    if (!msg.channel.guild) {
      return throwPublicErrorInfo('Reset', 'This command can only be used in a server.', 'In DM');
    }

    if (!monochrome.userIsServerAdmin(msg)) {
      return throwPublicErrorInfo('Reset', 'Only a server admin can use this command.', 'Not a server admin');
    }

    await msg.channel.createMessage({
      embed: {
        title: '⚠️ Reset server leaderboard ⚠️',
        description: `You are about to reset the server leaderboard. This is irreversible. If you\'re sure, say **confirm**. To cancel, say anything else.`,
        color: constants.EMBED_WARNING_COLOR,
      },
    });

    let responseMsg;
    try {
      responseMsg = await monochrome.waitForMessage(
        120000,
        (c) => c.author.id === msg.author.id && c.channel.id === msg.channel.id,
      );
    } catch (err) {
      if (err.message === 'WAITER TIMEOUT') {
        return msg.channel.createMessage('No response, did not reset the leaderboard.');
      } else {
        throw err;
      }
    }

    const response = responseMsg.content.toLowerCase().trim();

    if (response !== 'confirm') {
      return msg.channel.createMessage('You did not say **confirm**. The server leaderboard has **not** been reset.');
    }

    await scores.clearServerScores(msg.channel.guild.id);

    return msg.channel.createMessage('The server leaderboard has been reset.');
  },
};
