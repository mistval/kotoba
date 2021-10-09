const { Permissions } = require('monochrome-bot');
const scores = require('../common/quiz/score_storage_utils.js');
const { throwPublicErrorInfo } = require('../common/util/errors.js');
const constants = require('../common/constants.js');

const serverConfirmationMessages = {
  noResponse: 'No response, did not reset the leaderboard.',
  nonConfirmResponse: 'You did not say **confirm**. The server leaderboard has **not** been reset.',
  success: 'The server leaderboard has been reset.',
};

const userConfirmationMessages = {
  noResponse: 'No response, did not reset user\'s scores.',
  nonConfirmResponse: 'You did not say **confirm**. The user\'s scores have **not** been reset.',
  success: 'The user\'s scores have been reset.',
};

function getUserId(suffix) {
  const match = suffix.match(/(?:<@!?)?([0-9]+)>?/);
  if (!match) {
    return undefined;
  }

  const fullMatch = match[0];
  if (fullMatch !== suffix) {
    return undefined;
  }

  const id = match[1];
  return id;
}

async function waitForConfirmation(monochrome, messages, msg, userId) {
  let responseMsg;
  try {
    responseMsg = await monochrome.waitForMessage(
      120000,
      (c) => c.author.id === msg.author.id && c.channel.id === msg.channel.id,
    );
  } catch (err) {
    if (err.message === 'WAITER TIMEOUT') {
      return msg.channel.createMessage(messages.noResponse);
    }

    throw err;
  }

  const response = responseMsg.content.toLowerCase().trim();

  if (response !== 'confirm') {
    return msg.channel.createMessage(messages.nonConfirmResponse);
  }

  await scores.clearServerScores(msg.channel.guild.id, userId);

  return msg.channel.createMessage(messages.success);
}

async function resetServerUser(monochrome, msg, suffix) {
  const userId = getUserId(suffix);

  if (!userId) {
    return msg.channel.createMessage(`I didn't understand the user ID (**${suffix}**), please provide a numeric user ID or a mention.`);
  }

  await msg.channel.createMessage({
    embed: {
      title: '⚠️ Reset User Server Scores ⚠️',
      description: `You are about to erase all of <@${userId}>'s (${userId}) scores in this server. This is irreversible. If you're sure, say **confirm**. To cancel, say anything else.`,
      color: constants.EMBED_WARNING_COLOR,
    },
  });

  return waitForConfirmation(monochrome, userConfirmationMessages, msg, userId);
}

async function resetServer(monochrome, msg) {
  await msg.channel.createMessage({
    embed: {
      title: '⚠️ Reset Server Leaderboard ⚠️',
      description: 'You are about to reset the leaderboard in this server. This is irreversible. If you\'re sure, say **confirm**. To cancel, say anything else.\n\nTo reset just one user\'s scores, cancel this and then use the command again with a user ID or mention (not username).',
      color: constants.EMBED_WARNING_COLOR,
    },
  });

  return waitForConfirmation(monochrome, serverConfirmationMessages, msg);
}

module.exports = {
  commandAliases: ['resetserverleaderboard'],
  uniqueId: 'resetserverleaderboard',
  cooldown: 10,
  shortDescription: 'Reset the server leaderboard.',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  async action(bot, msg, suffix, monochrome) {
    if (!msg.channel.guild) {
      return throwPublicErrorInfo('Reset server leaderboard', 'This command can only be used in a server.', 'In DM');
    }

    if (!monochrome.userIsServerAdmin(msg)) {
      return throwPublicErrorInfo('Reset server leaderboard', 'Only a server admin can use this command.', 'Not a server admin');
    }

    const userIdSpecified = Boolean(suffix);

    return userIdSpecified
      ? resetServerUser(monochrome, msg, suffix)
      : resetServer(monochrome, msg);
  },
};
