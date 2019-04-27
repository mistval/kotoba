const assert = require('assert');
const reload = require('require-reload')(require);
const { Permissions } = require('monochrome-bot');

const shiritoriManager = require('shiritori');

const { REJECTION_REASON } = shiritoriManager;
const constants = reload('./../common/constants.js');
const errors = reload('./../common/util/errors.js');
const retryPromise = reload('./../common/util/retry_promise.js');

// Piggyback on the quiz scores for now.
const quizScoreStorageUtils = reload('./../common/quiz/score_storage_utils.js');

const EMBED_FIELD_MAX_LENGTH = 1024;
const EMBED_TRUNCATION_REPLACEMENT = '   [...]';
const LOGGER_TITLE = 'SHIRITORI';

function throwIfSessionInProgress(locationId, prefix) {
  if (shiritoriManager.gameExists(locationId)) {
    errors.throwPublicErrorInfo(
      'Game in progress',
      `There is already a game in progress. I can't start another, that would be confusing! You can stop the current game by saying **${prefix}shiritori stop**.`,
      'Session in progress',
    );
  }
}

function createMarkdownLinkForWord(word) {
  return `[${word}](http://jisho.org/search/${encodeURIComponent(word)})`;
}

function createScoresString(scoreForUserID) {
  return Object.keys(scoreForUserID)
    .sort((userIdA, userIdB) => scoreForUserID[userIdB] - scoreForUserID[userIdA])
    .map(userId => `<@${userId}> has ${scoreForUserID[userId]} points`).join('\n');
}

function getPluralizer(array) {
  if (array.length > 1) {
    return 's';
  }
  return '';
}

function discordDescriptionForRejection(rejectionReason, extraData) {
  if (rejectionReason === REJECTION_REASON.ReadingAlreadyUsed) {
    return `Someone already used the reading${getPluralizer(extraData)}: **${extraData.join(', ')}**. The same reading can't be used twice in a game (even if the kanji is different!)`;
  } else if (rejectionReason === REJECTION_REASON.ReadingEndsWithN) {
    return `Words in Shiritori can't have readings that end with ん! (**${extraData.join(', ')}**)`;
  } else if (rejectionReason === REJECTION_REASON.WrongStartSequence) {
    return `Your answer must begin with ${extraData.expected.join(', ')}. I found these readings for that word but they don't start with the right kana: **${extraData.actual.join(', ')}**`;
  } else if (rejectionReason === REJECTION_REASON.NotNoun) {
    return `Shiritori words must be nouns! I didn't find any nouns for the reading${getPluralizer(extraData.join)}: **${extraData.join(', ')}**`;
  }

  assert(false, 'Unexpected branch');
  return undefined;
}

function sendEmbedWithColor(channel, title, description, color) {
  return retryPromise(() => channel.createMessage({
    embed: {
      title,
      description,
      color,
    },
  }));
}

function sendNeutralEmbed(channel, title, description) {
  return sendEmbedWithColor(channel, title, description, constants.EMBED_NEUTRAL_COLOR);
}

function sendErrorEmbed(channel, title, description) {
  return sendEmbedWithColor(channel, title, description, constants.EMBED_WRONG_COLOR);
}

function getNameForUserID(bot, userIDs) {
  const nameForUserID = {};
  userIDs.forEach((userID) => {
    const user = bot.users.get(userID);
    nameForUserID[userID] = `${user.username}#${user.discriminator}`;
  });

  return nameForUserID;
}

function saveScores(bot, commanderMessage, scoreForUserID) {
  const scoreScopeID = commanderMessage.channel.guild
    ? commanderMessage.channel.guild.id
    : commanderMessage.channel.id;

  const scoreForDeckForUserID = {};
  Object.keys(scoreForUserID).forEach((userID) => {
    scoreForDeckForUserID[userID] = {
      shiritori: scoreForUserID[userID],
    };
  });

  const nameForUserID = getNameForUserID(bot, Object.keys(scoreForUserID));
  return quizScoreStorageUtils.addScores(
    scoreScopeID,
    scoreForDeckForUserID,
    nameForUserID,
  );
}

class DiscordClientDelegate {
  constructor(bot, commanderMessage, logger) {
    this.bot = bot;
    this.commanderMessage = commanderMessage;
    this.logger = logger;
  }

  onPlayerSetInactive(userId, reason) {
    const { channel } = this.commanderMessage;

    if (userId === this.bot.user.id) {
      return sendNeutralEmbed(
        channel,
        'I\'m leaving!',
        'Well, I\'ll continue judging, but I won\'t take turns anymore :) You can say **bot join** if you would like me to start playing with you again.',
      );
    } else if (reason === shiritoriManager.PlayerSetInactiveReason.EXTERNAL_LEAVE_REQUEST) {
      return sendNeutralEmbed(
        channel,
        'Player left',
        `<@${userId}> has left the game.`,
      );
    } else if (reason === shiritoriManager.PlayerSetInactiveReason.AFK) {
      return sendErrorEmbed(
        channel,
        'Player left',
        `<@${userId}> seems AFK so I'm booting them! They can say **join** to rejoin.`,
      );
    }
    assert(false, 'Unexpected branch');
    return undefined;
  }

  onGameEnded(reason, args) {
    const channelId = this.commanderMessage.channel.id;
    const scoreForUserID = shiritoriManager.getScores(channelId);
    saveScores(this.bot, this.commanderMessage, scoreForUserID);

    let description;

    if (reason === shiritoriManager.EndGameReason.EXTERNAL_STOP_REQUEST) {
      description = `<@${args}> asked me to stop.`;
    } else if (reason === shiritoriManager.EndGameReason.NO_PLAYERS) {
      description = 'There are no players left, so I stopped.';
    } else if (reason === shiritoriManager.EndGameReason.ERROR) {
      this.logger.logFailure(LOGGER_TITLE, 'Error', args);
      description = 'I had an error and had to stop :( The error has been logged and will be addressed.';
    } else {
      assert(false, 'Unknown stop reason');
    }

    const wordHistory = shiritoriManager.getAnswerHistory(channelId);

    let wordHistoryString = wordHistory.map(wordInformation => wordInformation.word).join('　');
    if (wordHistoryString.length > EMBED_FIELD_MAX_LENGTH) {
      wordHistoryString = wordHistoryString.substring(
        0,
        EMBED_FIELD_MAX_LENGTH - EMBED_TRUNCATION_REPLACEMENT.length,
      );

      wordHistoryString += EMBED_TRUNCATION_REPLACEMENT;
    }

    const embedFields = [];
    if (wordHistoryString) {
      embedFields.push({
        name: `Words used (${wordHistory.length})`,
        value: wordHistoryString,
      });
    }

    const scorersString = createScoresString(scoreForUserID);
    if (scorersString) {
      embedFields.push({
        name: 'Scores',
        value: scorersString,
      });
    }

    const { prefix } = this.commanderMessage;
    return retryPromise(() => this.commanderMessage.channel.createMessage({
      embed: {
        title: 'Shiritori Ended',
        description,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: embedFields,
        footer: {
          text: `Say '${prefix}lb shiritori' to see the leaderboard for this server. '${prefix}lb global shiritori' for global scores.`,
          icon_url: constants.FOOTER_ICON_URI,
        },
      },
    }));
  }

  onPlayerAnswered(currentPlayerId) {
    this.previousAnswererId = currentPlayerId;
  }

  async onAwaitingInputFromPlayer(playerId, previousWordInformation) {
    if (!this.previousAnswererId) {
      return undefined;
    }

    let readingPart = '';
    if (previousWordInformation.reading !== previousWordInformation.word) {
      readingPart = ` (${previousWordInformation.reading})`;
    }

    const previousAnswererUsername = this.bot.users.get(this.previousAnswererId).username;
    const scoreForUserID = shiritoriManager.getScores(this.commanderMessage.channel.id);

    const fields = [
      {
        name: `${previousAnswererUsername} (${scoreForUserID[this.previousAnswererId]}) said`,
        value: `${createMarkdownLinkForWord(previousWordInformation.word)}${readingPart}`,
      },
      {
        name: 'It means',
        value: previousWordInformation.meaning,
      },
      {
        name: 'Next word starts with',
        value: previousWordInformation.nextWordMustStartWith.join(', '),
      },
    ];

    let content = '';
    const previousWasBot = this.previousAnswererId === this.bot.user.id;
    const currentIsBot = playerId === this.bot.user.id;
    if (previousWasBot && !currentIsBot) {
      content = `I say ${previousWordInformation.word}`;
    }

    const message = {
      content,
      embed: {
        description: `${previousAnswererUsername} went and now it's <@${playerId}>'s turn!`,
        fields,
        color: constants.EMBED_NEUTRAL_COLOR,
        footer: {
          text: 'Say \'join\' to join!',
          icon_url: constants.FOOTER_ICON_URI,
        },
      },
    };

    await retryPromise(() => this.commanderMessage.channel.createMessage(message));

    if (playerId === this.bot.user.id) {
      return this.bot.sendChannelTyping(this.commanderMessage.channel.id).catch((err) => {
        this.logger.logFailure(LOGGER_TITLE, 'Failed to send typing', err);
      });
    }

    return undefined;
  }

  onPlayerSkipped(playerId) {
    return sendErrorEmbed(
      this.commanderMessage.channel,
      'Skipping Player',
      `<@${playerId}> is taking too long so I'm skipping them!`,
    );
  }

  onPlayerReactivated(playerId) {
    return sendNeutralEmbed(
      this.commanderMessage.channel,
      'Player rejoined',
      `<@${playerId}> has rejoined the game.`,
    );
  }

  onNewPlayerAdded(playerId) {
    if (playerId === this.bot.user.id) {
      return undefined;
    }

    if (!this.firstPlayerHasJoined) {
      this.firstPlayerHasJoined = true;
      return undefined;
    }

    return sendNeutralEmbed(
      this.commanderMessage.channel,
      'Player joined',
      `<@${playerId}> has joined the game. Their turn will come soon!`,
    );
  }

  onAnswerRejected(playerId, input, rejectionReason, rejectionInfo, msg) {
    if (rejectionReason === shiritoriManager.REJECTION_REASON.UnknownWord) {
      return retryPromise(() => msg.addReaction('❓'));
    }

    const description = discordDescriptionForRejection(rejectionReason, rejectionInfo);
    return retryPromise(() => this.commanderMessage.channel.createMessage({
      embed: {
        title: `Answer Rejected (${input})`,
        description,
        color: constants.EMBED_WRONG_COLOR,
        footer: {
          icon_url: constants.FOOTER_ICON_URI,
          text: 'Better come up with something else ;)',
        },
      },
    }));
  }

  onNonFatalError(err) {
    this.logger.logFailure(LOGGER_TITLE, 'Non fatal error', err);
  }
}

function getGameStartDescription(prefix) {
  return `
Starting a Shiritori game. I'll go first!

* To stop the game say **${prefix}shiritori stop**.
* Other players can join by saying **join**.
* If you don't want to play with me, say **bot leave** and I'll leave the game :(
  `;
}

module.exports = {
  commandAliases: ['shiritori', 'st', 'sh'],
  canBeChannelRestricted: true,
  cooldown: 2,
  uniqueId: 'shiritori43953',
  shortDescription: 'Start a game of shiritori in this channel.',
  longDescription: 'Start a game of shiritori in this channel. **<prefix>shiritori hardcore** starts a game in hardcore mode, which means you get kicked out if you give an invalid answer. Some timing settings can be configured in **<prefix>settings shiritori**',
  requiredBotPermissions: [
    Permissions.embedLinks,
    Permissions.sendMessages,
    Permissions.addReactions,
  ],
  requiredSettings: [
    'shiritori/bot_turn_minimum_wait',
    'shiritori/bot_turn_maximum_wait',
    'shiritori/answer_time_limit',
    'shiritori/bot_score_multiplier',
  ],
  async action(bot, msg, suffix, monochrome, serverSettings) {
    const locationId = msg.channel.id;
    const suffixLowerCase = suffix.toLowerCase();

    if (suffixLowerCase === 'stop') {
      return shiritoriManager.stopGame(locationId, msg.author.id);
    }

    const { prefix } = msg;
    throwIfSessionInProgress(locationId, prefix);
    const clientDelegate = new DiscordClientDelegate(bot, msg, monochrome.getLogger());

    const botTurnMinimumWaitInMs = serverSettings['shiritori/bot_turn_minimum_wait'] * 1000;
    const botTurnMaximumWaitInMs = Math.max(botTurnMinimumWaitInMs, serverSettings['shiritori/bot_turn_maximum_wait'] * 1000);
    const singlePlayerTimeoutMs = serverSettings['shiritori/answer_time_limit'] * 1000;
    const botScoreMultiplier = serverSettings['shiritori/bot_score_multiplier'];

    const settings = {
      singlePlayerTimeoutMs,
      multiPlayerTimeoutMs: singlePlayerTimeoutMs,
      botTurnMaximumWaitInMs,
      botTurnMinimumWaitInMs,
      botScoreMultiplier,
      autoRejoin: false,
    };

    shiritoriManager.createGame(locationId, clientDelegate, settings);
    shiritoriManager.addBotPlayer(locationId, bot.user.id);
    shiritoriManager.addRealPlayer(locationId, msg.author.id);

    await retryPromise(() => msg.channel.createMessage({
      embed: {
        title: 'Shiritori',
        description: getGameStartDescription(prefix),
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    }));

    return shiritoriManager.startGame(locationId);
  },
};
