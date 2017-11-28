'use strict'
const reload = require('require-reload')(require);
const content = reload('./../kotoba/quiz_decks_content.js');

module.exports = {
  commandAliases: ['k!quizdecks', 'k!qd'],
  canBeChannelRestricted: true,
  cooldown: 20,
  uniqueId: 'quizdecks45485',
  action(bot, msg, suffix) {
    return bot.createMessage(msg.channel.id, content);
  },
};
