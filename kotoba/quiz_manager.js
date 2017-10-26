'use strict'
const reload = require('require-reload')(require);

let implementation;

class QuizManager {
  constructor() {
    this.quizForChannelId = {};
    this.quizStateForChannelId = {};
  }

  reload() {
    implementation = reload('./quiz_manager_implementation.js');
  }

  createQuizSession(bot, msg, quiz) {
    return implementation.createQuizSession(this, bot, msg, quiz);
  }

  processUserInput(bot, msg) {
    return implementation.processUserInput(this, bot, msg);
  }

  stopQuiz(bot, msg) {
    return implementation.stopQuiz(this, bot, msg);
  }
}

module.exports = new QuizManager();
