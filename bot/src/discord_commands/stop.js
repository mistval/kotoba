const shiritoriManager = require('kotoba-node-common').shiritori;
const quizManager = require('../common/quiz/manager.js');

module.exports = {
  commandAliases: ['stop', 'endquiz', 'end', 'quit', 'cancel', 'ｑｓ'],
  shortDescription: 'Stop the currently running game (quiz or shiritori).',
  canBeChannelRestricted: false,
  uniqueId: 'stop',
  attachIsServerAdmin: true,
  interaction: {
    compatibilityMode: true,
    options: [],
  },
  async action(bot, msg) {
    const locationId = msg.channel.id;
    const userId = msg.author.id;

    await Promise.all([
      quizManager.stopQuiz(locationId, userId, msg.authorIsServerAdmin),
      shiritoriManager.stopGame(locationId, userId),
    ]);

    if (msg.isInteraction) {
      await msg.channel.createMessage('✅ Okie');
    }
  },
};
