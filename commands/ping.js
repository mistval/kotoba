'use strict'
module.exports = {
  commandAliases: ['bot!ping', 'bot!p'],
  canBeChannelRestricted: true,
  uniqueId: 'ping5959045',
  serverAdminOnly: false,
  shortDescription: 'You say bot!ping, I say pong.',
  action(bot, msg, suffix) {
    return msg.channel.createMessage('Pong!');
  },
};
