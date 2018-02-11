'use strict'
const reload = require('require-reload')(require);
const quizManager = reload('./../kotoba/quiz_manager.js');

module.exports = {
  commandAliases: ['k!endquiz', 'k!endtest', 'k!stop', 'k!quit', 'ｋ！ｑｓ'],
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    return quizManager.stopQuiz(msg.channel.id, msg.author.id);
  },
};
