

const quizManager = require('./../common/quiz/manager.js');
const shiritoriManager = require('kotoba-node-common').shiritori;

module.exports = {
  commandAliases: ['endquiz', 'endtest', 'stop', 'quit', 'ｑｓ'],
  canBeChannelRestricted: false,
  uniqueId: 'stop',
  action(bot, msg) {
    const locationId = msg.channel.id;
    const userId = msg.author.id;

    return Promise.all([
      quizManager.stopQuiz(locationId, userId),
      shiritoriManager.stopGame(locationId, userId),
    ]);
  },
};
