'use strict'
let quizManager = require('./../kotoba/quiz_manager.js');

module.exports = {
  commandAliases: ['k!endquiz', 'k!endtest', 'k!stop', 'k!quit'],
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    quizManager.stopQuiz(bot, msg);
  },
};
