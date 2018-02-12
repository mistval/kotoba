'use strict'
const reload = require('require-reload')(require);
const shiritoriManager = reload('./../kotoba/shiritori/shiritori_manager.js');
const PublicError = reload('monochrome-bot').PublicError;
const constants = reload('./../kotoba/constants.js');
const ShiritoriSession = reload('./../kotoba/shiritori/shiritori_session.js');

function throwIfSessionInProgress(locationId) {
  if (shiritori.isSessionInProgressAtLocation(locationId)) {
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

class DiscordClientDelegate {
  constructor(commanderMessage) {
    this.commanderMessage_ = commanderMessage;
  }

  notifyStarting(inMs) {
    const inSeconds = Math.floor(inMs / 1000);
    return this.commanderMessage_.channel.createMessage({
      embed: {
        title: 'Shiritori',
        description: `Starting a Shiritori game in ${inSeconds} seconds!`,
      },
    });
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

    const clientDelegate = new DiscordClientDelegate(msg);
    const session = new ShiritoriSession([msg.author.id], clientDelegate);

    return shiritoriManager.startSession(session, locationId);
  },
};
