const QuizManager = require('./../kotoba/quiz_manager.js');

module.exports = {
  name: 'Quiz Answer',
  action: (bot, msg) => {
    return QuizManager.processUserInput(bot, msg);
  }
};
