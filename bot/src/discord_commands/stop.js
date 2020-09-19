

const quizManager = require('./../common/quiz/manager.js');
const shiritoriManager = require('kotoba-node-common').shiritori;

module.exports = {
  commandAliases: ['endquiz', 'end', 'stop', 'quit', 'cancel', 'ｑｓ'],
  canBeChannelRestricted: false,
  uniqueId: 'stop',
  attachIsServerAdmin: true,
  action(bot, msg) {
    const locationId = msg.channel.id;
    const userId = msg.author.id;

    return Promise.all([
      quizManager.stopQuiz(locationId, userId, msg.authorIsServerAdmin),
      shiritoriManager.stopGame(locationId, userId),
    ]);
  },
};
