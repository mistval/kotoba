'use strict'
const reload = require('require-reload')(require);
const shiritoriManager = reload('./../kotoba/shiritori/shiritori_manager.js');
const PublicError = reload('monochrome-bot').PublicError;
const constants = reload('./../kotoba/constants.js');
const ShiritoriSession = reload('./../kotoba/shiritori/shiritori_session.js');
const JapaneseGameStrategy = reload('./../kotoba/shiritori/japanese_game_strategy.js');
const assert = require('assert');
const logger = reload('monochrome-bot').logger;

const EMBED_FIELD_MAX_LENGTH = 1024;
const EMBED_TRUNCATION_REPLACEMENT = '   [...]';

function throwIfSessionInProgress(locationId) {
  if (shiritoriManager.isSessionInProgressAtLocation(locationId)) {
    const message = {
      embed: {
        title: 'Game in progress',
        description: 'There is already a game in progress. I can\'t start another, that would be confusing!',
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
    throw PublicError.createWithCustomPublicMessage(message, false, 'Session in progress');
  }
}

function getDescriptionForTookTurnEmbed(previousPlayerId, nextPlayerId, nextPlayerIsBot, previousPlayerWasBot) {
  if (nextPlayerIsBot && previousPlayerWasBot) {
    return 'It\'s my turn again!';
  } else if (nextPlayerIsBot) {
    return `<@${previousPlayerId}> went and now it\'s my turn!`;
  } else if (previousPlayerWasBot) {
    return `I went and now it's <@${nextPlayerId}>'s turn!`;
  } else {
    return `<@${previousPlayerId}> went and now it's <@${nextPlayerId}>'s turn!`;
  }
}

function getPlayerName(wordInformation) {
  let isBot = wordInformation.userId === ShiritoriSession.BOT_USER_ID;
  if (isBot) {
    return 'I';
  } else {
    return wordInformation.userName;
  }
}

function createMarkdownLinkForWord(word) {
  return `[${word}](http://jisho.org/search/${encodeURIComponent(word)})`;
}

function createFieldForUsedWord(msg, wordInformation) {
  let playerName = getPlayerName(wordInformation);
  let readingPart = '';
  if (wordInformation.reading !== wordInformation.word) {
    readingPart = `(${wordInformation.reading})`;
  }
  return {
    name: `${playerName} said`,
    value: `${createMarkdownLinkForWord(wordInformation.word)} ${readingPart}`,
    inline: true,
  }
}

function createFieldsForTookTurnEmbed(msg, wordHistory) {
  let previousWord = wordHistory[wordHistory.length - 1];
  let penultimateWord = wordHistory[wordHistory.length - 2];

  let fields = [];
  if (penultimateWord) {
    fields.push(createFieldForUsedWord(msg, penultimateWord));
  }

  fields.push(createFieldForUsedWord(msg, previousWord));

  if (previousWord.meaning) {
    fields.push({name: 'It Means', value: previousWord.meaning});
  }

  fields.push({
    name: 'Next word starts with',
    value: previousWord.nextWordMustStartWith.join(', '),
  });

  return fields;
}

class DiscordClientDelegate {
  constructor(bot, commanderMessage) {
    this.bot_ = bot;
    this.commanderMessage_ = commanderMessage;
  }

  botLeft(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: `I'm leaving!`,
        description: `Well, I'll continue judging, but I won't take turns anymore :) <@${userId}> asked me to leave the game. You can say **bot join** if you would like me to start playing with you again.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  botJoined(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: `I'm back!`,
        description: `<@${userId}> asked me to rejoin the game.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  stopped(reason, wordHistory, arg) {
    let description;
    clearTimeout(this.sendTypingTimeout);
    if (reason === shiritoriManager.EndGameReason.STOP_COMMAND) {
      description = `<@${arg.userId}> asked me to stop.`;
    } else if (reason === shiritoriManager.EndGameReason.NO_PLAYERS) {
      if (arg.botIsPlaying) {
        description = 'I am the last player, so I stopped.';
      } else if (arg.players[0]) {
        description = `<@${arg.players[0]}> is the last player standing, so I stopped. Congratulations!`;
      } else {
        description = `There's no one left in the game, so I stopped!`;
      }
    } else if (reason === shiritoriManager.EndGameReason.ERROR) {
      description = 'I had an error and had to stop :( The error has been logged and will be addressed.';
    } else {
      assert(false, 'Unknown stop reason');
    }

    let wordHistoryString = wordHistory.map(wordInformation => wordInformation.word).join('   ');
    if (wordHistoryString.length > EMBED_FIELD_MAX_LENGTH) {
      wordHistoryString = wordHistoryString.substring(0, EMBED_FIELD_MAX_LENGTH - EMBED_TRUNCATION_REPLACEMENT.length) + EMBED_TRUNCATION_REPLACEMENT;
    }

    let wordsUsedString = wordHistory.map(wordInformation => wordInformation.word).join(', ');
    let embedFields;
    if (wordsUsedString) {
      embedFields = [{
        name: `Words used (${wordHistory.length})`,
        value: wordHistoryString,
      }];
    }

    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Shiritori Ended',
        description: description,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: embedFields,
      },
    });
  }

  notifyStarting(inMs) {
    const inSeconds = Math.floor(inMs / 1000);
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Shiritori',
        description: `Starting a Shiritori game in ${inSeconds} seconds. Other players can join by saying **join**. Say **k!shiritori stop** when you want to stop. I'll go first!\n\nBy the way, if you want me to kick players out of the game when they violate a rule, you can start a game with **k!shiritori hardcore**.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  addedPlayer(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Player Joined',
        description: `<@${userId}> has joined the game! Their turn will come soon. You can leave the game by saying **leave**. If you'd like me to stop playing, say **bot leave**.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  skippedPlayer(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Skipping Player',
        description: `<@${userId}> is taking too long so I'm skipping them!`,
        color: constants.EMBED_WRONG_COLOR,
      },
    });
  }

  removedPlayerForInactivity(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Removing Player',
        description: `<@${userId}> seems AFK so I'm booting them! They can rejoin by saying **join**.`,
        color: constants.EMBED_WRONG_COLOR,
      },
    });
  }

  removedPlayerForRuleViolation(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Removing Player',
        description: `<@${userId}> violated a rule, and this is **hardcore mode**, so they get booted! They can rejoin by saying **join**.`,
        color: constants.EMBED_WRONG_COLOR,
      },
    });
  }

  playerLeft(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Player left',
        description: `<@${userId}> has left the game.`,
        color: constants.EMBED_NEUTRAL_COLOR,
      }
    });
  }

  botWillTakeTurnIn(inMs) {
    if (inMs === 0) {
      return Promise.resolve();
    }
    if (inMs > 3500) {
      this.sendTypingTimeout = setTimeout(() => {
        this.bot_.sendChannelTyping(this.commanderMessage_.channel.id).catch(err => {
          logger.logFailure('SHIRITORI', 'Failed to send typing', err);
        });
      }, inMs - 3000);
    }
  }

  playerTookTurn(wordHistory, nextPlayerId, previousPlayerWasBot, nextPlayerIsBot) {
    let wordInformation = wordHistory[wordHistory.length - 1];
    let previousPlayerId = wordInformation.userId;
    let fields = [];
    let content;
    if (previousPlayerWasBot && !nextPlayerIsBot) {
      content = 'I say **' + wordInformation.word + '**!'
    }
    let message = {
      content: content,
      embed: {
        description: getDescriptionForTookTurnEmbed(previousPlayerId, nextPlayerId, nextPlayerIsBot, previousPlayerWasBot),
        fields: createFieldsForTookTurnEmbed(this.commanderMessage_, wordHistory),
        color: constants.EMBED_NEUTRAL_COLOR,
        footer: {
          text: `Say 'join' to join!`,
          icon_url: constants.FOOTER_ICON_URI,
        },
      },
    };

    return this.commanderMessage_.channel.createMessage(message);
  }

  answerRejected(input, rejectionReason) {
    let message = {
      embed: {
        title: `Answer Rejected (${input})`,
        description: rejectionReason,
        color: constants.EMBED_WRONG_COLOR,
        footer: {
          icon_url: constants.FOOTER_ICON_URI,
          text: 'Better come up with something else ;)',
        },
      },
    };
    return this.commanderMessage_.channel.createMessage(message);
  }
}

function getScoreScopeIdForMessage(msg) {
  if (msg.channel.guild) {
    return msg.channel.guild.id;
  }
  return msg.channel.id;
}

module.exports = {
  commandAliases: ['k!shiritori', 'k!st', 'k!sh'],
  canBeChannelRestricted: true,
  cooldown: 2,
  uniqueId: 'shiritori43953',
  shortDescription: 'Start a game of shiritori in this channel.',
  longDescription: 'Start a game of shiritori in this channel. **k!shiritori hardcore** starts a game in hardcore mode, which means you get kicked out if you give an invalid answer. Some timing settings can be configured in **k!settings shiritori**',
  requiredSettings: [
    'shiritori/bot_turn_minimum_wait',
    'shiritori/bot_turn_maximum_wait',
    'shiritori/answer_time_limit',
  ],
  action(bot, msg, suffix, serverSettings) {
    const locationId = msg.channel.id;

    if (suffix === 'stop') {
      return shiritoriManager.stop(locationId, msg.author.id);
    }

    throwIfSessionInProgress(locationId);
    const clientDelegate = new DiscordClientDelegate(bot, msg);

    let suffixLowerCase = suffix.toLowerCase();
    let removePlayerForRuleViolations = suffixLowerCase === 'hardcore' || suffixLowerCase === 'hc';
    let botTurnMinimumWaitInMs = serverSettings['shiritori/bot_turn_minimum_wait'] * 1000;
    let botTurnMaximumWaitInMs = Math.max(botTurnMinimumWaitInMs, serverSettings['shiritori/bot_turn_maximum_wait'] * 1000);
    let answerTimeLimitInMs = serverSettings['shiritori/answer_time_limit'] * 1000;
    let settings = {answerTimeLimitInMs, botTurnMinimumWaitInMs, botTurnMaximumWaitInMs, removePlayerForRuleViolations};
    let scoreScopeId = getScoreScopeIdForMessage(msg);

    const session = new ShiritoriSession(msg.author.id, msg.author.username, clientDelegate, new JapaneseGameStrategy(), locationId, settings);
    return shiritoriManager.startSession(session, scoreScopeId);
  },
};
