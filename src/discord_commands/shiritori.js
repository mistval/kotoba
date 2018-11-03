const assert = require('assert');
const reload = require('require-reload')(require);
const globals = require('./../common/globals.js');

const shiritoriManager = require('shiritori');
const { REJECTION_REASON } = shiritoriManager;
const constants = reload('./../common/constants.js');
const errors = reload('./../common/util/errors.js');

const EMBED_FIELD_MAX_LENGTH = 1024;
const EMBED_TRUNCATION_REPLACEMENT = '   [...]';

function throwIfSessionInProgress(locationId, prefix) {
  if (shiritoriManager.gameExists(locationId)) {
    errors.throwPublicErrorInfo(
      'Game in progress',
      `There is already a game in progress. I can't start another, that would be confusing! You can stop the current game by saying **${prefix}shiritori stop**.`,
      'Session in progress',
    );
  }
}

function getDescriptionForTookTurnEmbed(
  previousPlayerId,
  nextPlayerId,
  nextPlayerIsBot,
  previousPlayerWasBot,
) {
  if (nextPlayerIsBot && previousPlayerWasBot) {
    return 'It\'s my turn again!';
  } else if (nextPlayerIsBot) {
    return `<@${previousPlayerId}> went and now it's my turn!`;
  } else if (previousPlayerWasBot) {
    return `I went and now it's <@${nextPlayerId}>'s turn!`;
  }
  return `<@${previousPlayerId}> went and now it's <@${nextPlayerId}>'s turn!`;
}

function createMarkdownLinkForWord(word) {
  return `[${word}](http://jisho.org/search/${encodeURIComponent(word)})`;
}

function createFieldForUsedWord(msg, wordInformation, scoreForUserId) {
  const playerName = wordInformation.userName;
  let readingPart = '';
  if (wordInformation.reading !== wordInformation.word) {
    readingPart = `(${wordInformation.reading})`;
  }
  return {
    name: `${playerName} (${scoreForUserId[wordInformation.userId]}) said`,
    value: `${createMarkdownLinkForWord(wordInformation.word)} ${readingPart}`,
    inline: true,
  };
}

function createFieldsForTookTurnEmbed(msg, wordHistory, scoreForUserId) {
  const previousWord = wordHistory[wordHistory.length - 1];
  const penultimateWord = wordHistory[wordHistory.length - 2];

  const fields = [];
  if (penultimateWord) {
    fields.push(createFieldForUsedWord(msg, penultimateWord, scoreForUserId));
  }

  fields.push(createFieldForUsedWord(msg, previousWord, scoreForUserId));

  if (previousWord.meaning) {
    fields.push({ name: 'It Means', value: previousWord.meaning });
  }

  fields.push({
    name: 'Next word starts with',
    value: previousWord.nextWordMustStartWith.join(', '),
  });

  return fields;
}

function createScoresString(scoreForUserId) {
  return Object.keys(scoreForUserId)
    .sort((userIdA, userIdB) => scoreForUserId[userIdB] - scoreForUserId[userIdA])
    .map(userId => `<@${userId}> has ${scoreForUserId[userId]} points`).join('\n');
}

function getPluralizer(array) {
  if (array.length > 1) {
    return 's';
  }
  return '';
}

function discordReactionForRejection(rejection) {
  if (rejection.rejectionReason === REJECTION_REASON.UnknownWord) {
    return '❓';
  }

  return undefined;
}

function discordDescriptionForRejection(rejection) {
  if (rejection.rejectionReason === REJECTION_REASON.ReadingAlreadyUsed) {
    return `Someone already used the reading${getPluralizer(rejection.extraData)}: **${rejection.extraData.join(', ')}**. The same reading can't be used twice in a game (even if the kanji is different!)`;
  } else if (rejection.rejectionReason === REJECTION_REASON.ReadingEndsWithN) {
    return `Words in Shiritori can't have readings that end with ん! (**${rejection.extraData.join(', ')}**)`;
  } else if (rejection.rejectionReason === REJECTION_REASON.WrongStartSequence) {
    return `Your answer must begin with ${rejection.extraData.expected.join(', ')}. I found these readings for that word but they don't start with the right kana: **${rejection.extraData.actual.join(', ')}**`;
  } else if (rejection.rejectionReason === REJECTION_REASON.NotNoun) {
    return `Shiritori words must be nouns! I didn't find any nouns for the reading${getPluralizer(rejection.extraData.join)}: **${rejection.extraData.join(', ')}**`;
  }

  return undefined;
}

function sendNeutralEmbed(channel, title, description) {
  return channel.createMessage({
    embed: {
      title,
      description,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  });
}

// TODO: Send typing
class DiscordClientDelegate {
  constructor(bot, commanderMessage, logger) {
    this.bot = bot;
    this.commanderMessage = commanderMessage;
    this.logger = logger;
  }

  onPlayerSetInactive(userID, reason) {
    const { channel } = this.commanderMessage;

    if (userId === this.bot.user.id) {
      return sendNeutralEmbed(
        channel,
        'I\'m leaving!',
        `Well, I'll continue judging, but I won't take turns anymore :) <@${userId}> asked me to leave the game. You can say **bot join** if you would like me to start playing with you again.`,
      );
    } else if (reason === shiritoriManager.PlayerSetInactiveReason.EXTERNAL_LEAVE_REQUEST) {
      return sendNeutralEmbed(
        channel,
        'Player left',
        `<@${userId}> has left the game.`,
      );
    } else if (reason === shiritoriManager.PlayerSetInactiveReason.AFK) {
      return sendNeutralEmbed(
        channel,
        'Player left',
        `<@${userId}> seems AFK so I'm booting them! They can say **join** to rejoin.`,
      );
    } else {
      assert(false, 'Unexpected branch');
    }
  }

  onGameEnded(reason, args) {
    let description;

    if (reason === shiritoriManager.EndGameReason.EXTERNAL_STOP_REQUEST) {
      description = `<@${args}> asked me to stop.`;
    } else if (reason === shiritoriManager.EndGameReason.NO_PLAYERS) {
      description = 'There are no players left, so I stopped.';
    } else if (reason === shiritoriManager.EndGameReason.ERROR) {
      description = 'I had an error and had to stop :( The error has been logged and will be addressed.';
    } else {
      assert(false, 'Unknown stop reason');
    }

    const channelId = this.commanderMessage.channel.id;
    const wordHistory = shiritoriManager.getAnswerHistory(channelId);

    let wordHistoryString = wordHistory.map(wordInformation => wordInformation.word).join('   ');
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

    const scoreForUserId = shiritoriManager.getScores(channelId);
    const scorersString = createScoresString(scoreForUserId);
    if (scorersString) {
      embedFields.push({
        name: 'Scores',
        value: scorersString,
      });
    }

    const { prefix } = this.commanderMessage;
    return this.commanderMessage.channel.createMessage({
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
    });
  }

  onAwaitingInputFromPlayer(playerId, previousWord) {
    const playerName =
  }

  botJoined(userId) {
    return this.commanderMessage.channel.createMessage({
      embed: {
        title: 'I\'m back!',
        description: `<@${userId}> asked me to rejoin the game.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  notifyStarting(inMs) {
    const inSeconds = Math.floor(inMs / 1000);
    const prefix = this.commanderMessage.prefix;
    return this.commanderMessage.channel.createMessage({
      embed: {
        title: 'Shiritori',
        description: `Starting a Shiritori game in ${inSeconds} seconds. Other players can join by saying **join**. Say **${prefix}shiritori stop** when you want to stop. I'll go first!\n\nBy the way, if you want me to kick players out of the game when they violate a rule, you can start a game with **${prefix}shiritori hardcore**.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  addedPlayer(userId) {
    return this.commanderMessage.channel.createMessage({
      embed: {
        title: 'Player Joined',
        description: `<@${userId}> has joined the game! Their turn will come soon. You can leave the game by saying **leave**. If you'd like me to stop playing, say **bot leave**.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  skippedPlayer(userId) {
    return this.commanderMessage.channel.createMessage({
      embed: {
        title: 'Skipping Player',
        description: `<@${userId}> is taking too long so I'm skipping them!`,
        color: constants.EMBED_WRONG_COLOR,
      },
    });
  }

  removedPlayerForRuleViolation(userId) {
    return this.commanderMessage.channel.createMessage({
      embed: {
        title: 'Removing Player',
        description: `<@${userId}> violated a rule, and this is **hardcore mode**, so they get booted! They can rejoin by saying **join**.`,
        color: constants.EMBED_WRONG_COLOR,
      },
    });
  }

  botWillTakeTurnIn(inMs) {
    if (inMs > 3500) {
      this.sendTypingTimeout = setTimeout(() => {
        this.bot.sendChannelTyping(this.commanderMessage.channel.id).catch((err) => {
          this.logger.logFailure('SHIRITORI', 'Failed to send typing', err);
        });
      }, inMs - 3000);
    }
  }

  playerTookTurn(wordHistory, nextPlayerId, previousPlayerWasBot, nextPlayerIsBot, scoreForUserId) {
    const wordInformation = wordHistory[wordHistory.length - 1];
    const previousPlayerId = wordInformation.userId;

    let content;
    if (previousPlayerWasBot && !nextPlayerIsBot) {
      content = `I say **${wordInformation.word}**!`;
    }

    const description = getDescriptionForTookTurnEmbed(
      previousPlayerId,
      nextPlayerId,
      nextPlayerIsBot,
      previousPlayerWasBot,
    );

    const message = {
      content,
      embed: {
        description,
        fields: createFieldsForTookTurnEmbed(this.commanderMessage, wordHistory, scoreForUserId),
        color: constants.EMBED_NEUTRAL_COLOR,
        footer: {
          text: 'Say \'join\' to join!',
          icon_url: constants.FOOTER_ICON_URI,
        },
      },
    };

    return this.commanderMessage.channel.createMessage(message);
  }

  answerRejected(rejection, msg) {
    const emote = discordReactionForRejection(rejection);
    const description = discordDescriptionForRejection(rejection);

    if (emote) {
      return msg.addReaction(emote);
    }
    if (description) {
      const message = {
        embed: {
          title: `Answer Rejected (${rejection.rejectedInput})`,
          description,
          color: constants.EMBED_WRONG_COLOR,
          footer: {
            icon_url: constants.FOOTER_ICON_URI,
            text: 'Better come up with something else ;)',
          },
        },
      };
      return msg.channel.createMessage(message);
    }
  }
}

module.exports = {
  commandAliases: ['shiritori', 'st', 'sh'],
  canBeChannelRestricted: true,
  cooldown: 2,
  uniqueId: 'shiritori43953',
  shortDescription: 'Start a game of shiritori in this channel.',
  longDescription: 'Start a game of shiritori in this channel. **<prefix>shiritori hardcore** starts a game in hardcore mode, which means you get kicked out if you give an invalid answer. Some timing settings can be configured in **<prefix>settings shiritori**',
  requiredSettings: [
    'shiritori/bot_turn_minimum_wait',
    'shiritori/bot_turn_maximum_wait',
    'shiritori/answer_time_limit',
    'shiritori/bot_score_multiplier',
  ],
  action(erisBot, msg, suffix, monochrome, serverSettings) {
    const locationId = msg.channel.id;

    if (suffix === 'stop') {
      return shiritoriManager.stopGame(locationId, msg.author.id);
    }

    // TODO: Leaving game, removing bot from game.

    const prefix = msg.prefix;
    throwIfSessionInProgress(locationId, prefix);
    const clientDelegate = new DiscordClientDelegate(erisBot, msg);

    const suffixLowerCase = suffix.toLowerCase();
    const removePlayerForRuleViolations = suffixLowerCase === 'hardcore' || suffixLowerCase === 'hc';
    const botTurnMinimumWaitInMs = serverSettings['shiritori/bot_turn_minimum_wait'] * 1000;
    const botTurnMaximumWaitInMs = Math.max(botTurnMinimumWaitInMs, serverSettings['shiritori/bot_turn_maximum_wait'] * 1000);
    const singlePlayerTimeoutMs = serverSettings['shiritori/answer_time_limit'] * 1000;
    const botScoreMultipler = serverSettings['shiritori/bot_score_multiplier'];

    // TODO: Hardcore mode
    const settings = {
      singlePlayerTimeoutMs,
      multiPlayerTimeoutMs: singlePlayerTimeoutMs,
      botTurnMaximumWaitInMs,
      botTurnMinimumWaitInMs,
      botScoreMultipler,
    };

    // TODO: Saving scores
    shiritoriManager.createGame(locationId, clientDelegate, settings);
    shiritoriManager.addBotPlayer(locationId, erisBot.user.id);
    shiritoriManager.addRealPlayer(locationId, msg.author.id);
    return shiritoriManager.startGame(locationId);
  },
};
