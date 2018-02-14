'use strict'
const reload = require('require-reload')(require);
const shiritoriManager = reload('./../kotoba/shiritori/shiritori_manager.js');
const PublicError = reload('monochrome-bot').PublicError;
const constants = reload('./../kotoba/constants.js');
const ShiritoriSession = reload('./../kotoba/shiritori/shiritori_session.js');
const JapaneseGameStrategy = reload('./../kotoba/shiritori/japanese_game_strategy.js');

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
  if (nextPlayerIsBot) {
    return `<@${previousPlayerId}> went and now it\'s my turn!`;
  } else if (previousPlayerWasBot) {
    return `I went and now it's <@${nextPlayerId}>'s turn!`;
  } else {
    return `<@${previousPlayerId} went and now it's <@${nextPlayerId}>'s turn!`;
  }
}

function getPlayerName(msg, wordInformation) {
  let isBot = wordInformation.userId === ShiritoriSession.BOT_USER_ID;

  if (isBot) {
    return 'I';
  }

  if (!msg.channel.guild) {
    return msg.channel.recipient.username;
  }

  let member = msg.channel.guild.members.find(member => {
    member.id === wordInformation.userId;
  });

  if (member) {
    return member.username;
  }

  return 'Unknown';
}

function createFieldForUsedWord(msg, wordInformation) {
  let playerName = getPlayerName(msg, wordInformation);
  return {
    name: `${playerName} said`,
    value: `${wordInformation.word} (${wordInformation.reading})`,
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

  notifyStarting(inMs) {
    const inSeconds = Math.floor(inMs / 1000);
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Shiritori',
        description: `Starting a Shiritori game in ${inSeconds} seconds. I'll go first!`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    });
  }

  botWillTakeTurnIn(inMs) {
    if (inMs === 0) {
      return Promise.resolve();
    }
    return this.bot_.sendChannelTyping(this.commanderMessage_.channel.id);
  }

  playerTookTurn(wordHistory, nextPlayerId, previousPlayerWasBot, nextPlayerIsBot) {
    let previousPlayerId = wordHistory[wordHistory.length - 1].userId;
    let fields = [];
    let content;
    if (previousPlayerWasBot) {
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
    throwIfSessionInProgress(locationId);

    const clientDelegate = new DiscordClientDelegate(bot, msg);
    const session = new ShiritoriSession([msg.author.id], clientDelegate, new JapaneseGameStrategy());

    return shiritoriManager.startSession(session, locationId);
  },
};
