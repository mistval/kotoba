const reload = require('require-reload')(require);

const quizManager = reload('./../common/quiz/manager.js');
const shiritoriManager = require('shiritori');

module.exports = {
  commandAliases: ['endquiz', 'endtest', 'stop', 'quit', 'ｑｓ'],
  canBeChannelRestricted: false,
  uniqueId: 'stop',
  action(erisBot, msg) {
    const locationId = msg.channel.id;
    const userId = msg.author.id;

    return Promise.all([
      quizManager.stopQuiz(locationId, userId),
      shiritoriManager.stopGame(locationId, userId),
    ]);
  },
};
