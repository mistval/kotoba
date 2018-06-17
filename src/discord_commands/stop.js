const reload = require('require-reload')(require);

const quizManager = reload('./../common/quiz/manager.js');
const shiritoriManager = reload('./../common/shiritori/shiritori_manager.js');

module.exports = {
  commandAliases: ['endquiz', 'endtest', 'stop', 'quit', 'ｑｓ'],
  canBeChannelRestricted: false,
  uniqueId: 'stop',
  action(erisBot, msg) {
    const locationId = msg.channel.id;
    const userId = msg.author.id;

    return Promise.all([
      quizManager.stopQuiz(locationId, userId),
      shiritoriManager.stop(locationId, userId),
    ]);
  },
};
