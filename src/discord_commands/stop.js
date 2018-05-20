const reload = require('require-reload')(require);

const quizManager = reload('./../common/quiz/manager.js');
const shiritoriManager = reload('./../common/shiritori/shiritori_manager.js');

module.exports = {
  commandAliases: ['k!endquiz', 'k!endtest', 'k!stop', 'k!quit', 'ｋ！ｑｓ'],
  canBeChannelRestricted: false,
  action(erisBot, monochrome, msg) {
    const locationId = msg.channel.id;
    const userId = msg.author.id;

    return Promise.all([
      quizManager.stopQuiz(locationId, userId),
      shiritoriManager.stop(locationId, userId),
    ]);
  },
};
