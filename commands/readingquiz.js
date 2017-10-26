'use strict'
const reload = require('require-reload')(require);
const QuizManager = require('./../kotoba/quiz_manager.js');
const Quiz = reload('./../kotoba/quiz.js');
const content = reload('./../kotoba/quiz_decks_content.js');

QuizManager.reload();

module.exports = {
  commandAliases: ['k!readingQuiz', 'k!starttest', 'k!startquiz', 'k!rt', 'k!rq', 'k!q', 'k!quiz'],
  canBeChannelRestricted: true,
  uniqueId: 'readingQuiz14934',
  cooldown: 1,
  action(bot, msg, suffix) {
    if (suffix === 'stop' || suffix === 'end' || suffix === 'endquiz' || suffix === 'quit') {
      QuizManager.stopQuiz(bot, msg);
      return;
    }
    if (!suffix) {
      bot.createMessage(msg.channel.id, content);
      return;
    }
    let quiz = new Quiz(suffix);
    return QuizManager.createQuizSession(bot, msg, quiz);
  },
};
