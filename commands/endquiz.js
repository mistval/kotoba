'use strict'
let quizManager = require('./../kotoba/quiz_manager.js');

module.exports = {
  commandAliases: ['k!endquiz', 'k!endtest', 'k!stop', 'k!quit', 'ｋ！ｑｓ'],
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    return quizManager.stopQuiz(msg.channel.id, msg.author.id);
  },
};
