'use strict'
const reload = require('require-reload')(require);
const QuizManager = require('./../kotoba/quiz_manager.js');
const Quiz = reload('./../kotoba/quiz.js');
const content = reload('./../kotoba/quiz_decks_content.js');
const persistence = reload('monochrome-bot').persistence;

QuizManager.reload();

module.exports = {
  commandAliases: ['k!quiz', 'k!readingQuiz', 'k!starttest', 'k!startquiz', 'k!rt', 'k!rq', 'k!q'],
  aliasesForHelp: ['k!quiz', 'k!q'],
  canBeChannelRestricted: true,
  uniqueId: 'readingQuiz14934',
  cooldown: 1,
  shortDescription: 'Start a quiz with the specified deck.',
  longDescription: 'See available quiz decks, or start a quiz.\n\nYou can configure some quiz settings. If you want a JLPT N4 quiz with a score limit of 30, only 1 second between questions, and only 10 seconds to answer, try this:\nk!quiz N4 30 1 10\n\nAssociated commands:\nk!quiz stop (ends the current quiz)\nk!lb (shows the quiz leaderboard)\n\nServer admins can set default quiz settings by using the k!settings command.',
  usageExample: '\'k!quiz n5\'. \'k!quiz\' lists decks, \'k!quiz stop\' stops the quiz.',
  requiredSettings: [
    'quiz/japanese/answer_time_limit',
    'quiz/japanese/score_limit',
    'quiz/japanese/unanswered_question_limit',
    'quiz/japanese/new_question_delay_after_unanswered',
    'quiz/japanese/new_question_delay_after_answered',
    'quiz/japanese/additional_answer_wait_time',
  ],
  action(bot, msg, suffix, settings) {
    if (suffix.startsWith('stop') || suffix.startsWith('end') || suffix.startsWith('endquiz') || suffix.startsWith('quit')) {
      QuizManager.stopQuiz(bot, msg);
      return;
    }
    if (!suffix || suffix === 'help') {
      bot.createMessage(msg.channel.id, content);
      return;
    }
    let serverId = msg.channel.guild && msg.channel.guild.id;
    serverId = serverId || msg.channel.id;
    let quiz = new Quiz(settings, suffix, msg.channel.id);
    return QuizManager.createQuizSession(bot, msg, quiz);
  },
};
