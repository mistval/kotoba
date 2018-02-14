'use strict'
const reload = require('require-reload')(require);
const shiritoriManager = reload('./../kotoba/shiritori/shiritori_manager.js');
const PublicError = reload('monochrome-bot').PublicError;
const constants = reload('./../kotoba/constants.js');
const ShiritoriSession = reload('./../kotoba/shiritori/shiritori_session.js');
const JapaneseGameStrategy = reload('./../kotoba/shiritori/japanese_game_strategy.js');
const assert = require('assert');
const logger = reload('monochrome-bot').logger;

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

  stopped(reason, wordHistory, arg) {
    let description;
    clearTimeout(this.sendTypingTimeout);
    if (reason === shiritoriManager.EndGameReason.STOP_COMMAND) {
      description = `<@${arg}> asked me to stop.`;
    } else if (reason === shiritoriManager.EndGameReason.NO_PLAYERS) {
      description = 'There aren\'t any players left except me, so I stopped!';
    } else if (reason === shiritoriManager.EndGameReason.ERROR) {
      description = 'I had an error and had to stop :( The error has been logged and will be addressed.';
    } else {
      assert(false, 'Unknown stop reason');
    }

    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Shiritori Ended',
        description: description,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: [{
          name: 'Words used',
          value: wordHistory.map(wordInformation => wordInformation.word).join(', '),
        }],
      },
    });
  }

  notifyStarting(inMs) {
    const inSeconds = Math.floor(inMs / 1000);
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Shiritori',
        description: `Starting a Shiritori game in ${inSeconds} seconds. Say **k!shiritori stop** when you want to stop. I'll go first!`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  addedPlayer(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Player Joined',
        description: `<@${userId}> has joined the game! Their turn will come soon.`,
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

  removedPlayer(userId) {
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Removing Player',
        description: `<@${userId}> seems AFK so I'm booting them! They can rejoin by saying **join**.`,
        color: constants.EMBED_WRONG_COLOR,
      },
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
    let previousPlayerId = wordHistory[wordHistory.length - 1].userId;
    let fields = [];
    let content;
    if (previousPlayerWasBot && !nextPlayerIsBot) {
      content = 'I say **' + wordHistory[wordHistory.length - 1].word + '**!'
    }
    let message = {
      content: content,
      embed: {
        title: 'Shiritori',
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

module.exports = {
  commandAliases: ['k!shiritori'],
  canBeChannelRestricted: true,
  cooldown: 2,
  uniqueId: 'shiritori43953',
  shortDescription: 'Start a game of shiritori in this channel.',
  action(bot, msg, suffix) {
    const locationId = msg.channel.id;

    if (suffix === 'stop') {
      return shiritoriManager.stop(locationId, msg.author.id);
    }

    throwIfSessionInProgress(locationId);

    const clientDelegate = new DiscordClientDelegate(bot, msg);
    const session = new ShiritoriSession(msg.author.id, msg.author.username, clientDelegate, new JapaneseGameStrategy(), locationId);

    return shiritoriManager.startSession(session);
  },
};
