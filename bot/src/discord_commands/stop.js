const shiritoriManager = require('kotoba-node-common').shiritori;
const { ApplicationContexts, ApplicationIntegrationTypes } = require('monochrome-bot');
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
    contexts: [
      ApplicationContexts.GUILD,
      ApplicationContexts.BOT_DM,
    ],
    integrationTypes: [
      ApplicationIntegrationTypes.GUILD_INSTALL,
    ],
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
