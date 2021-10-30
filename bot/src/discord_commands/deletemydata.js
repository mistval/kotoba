const path = require('path');
const fs = require('fs');
const { CUSTOM_DECK_DIR } = require('kotoba-node-common').constants;
const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const UserModel = require('kotoba-node-common').models.createUserModel(mongoConnection);
const CustomDeckVoteModel = require('kotoba-node-common').models.createCustomDeckVoteModel(mongoConnection);
const ReportModel = require('kotoba-node-common').models.createGameReportModel(mongoConnection);
const constants = require('../common/constants.js');
const ScoreUtils = require('../common/quiz/score_storage_utils.js');

/**
* Delete a message (if the bot has moderator powers it can delete the messages of others.
* If not it can only delete its own messages).
* This isn't meant for moderation.
* Just if you mess up when using the }broadcast command, you can use this to delete the message.
* Of course if you are a server admin you can just delete the message yourself.
* Syntax: }delete [channel_id] [message_id]
*/
module.exports = {
  commandAliases: ['deletemydata'],
  shortDescription: 'Delete all data that I have stored for you.',
  uniqueId: 'deletemydata',
  hidden: true,
  async action(bot, msg, suffix, monochrome) {
    await msg.channel.createMessage({
      embed: {
        title: '⚠️ Delete User Data ⚠️',
        description: 'You are about to delete all data about you that I possess, including settings, quiz scores, custom decks, and all the other thingies. There is no going back. If you\'re sure, say **confirm**. To cancel, say anything else.',
        color: constants.EMBED_WARNING_COLOR,
      },
    });

    let responseMsg;
    try {
      responseMsg = await monochrome.waitForMessage(
        120000,
        (c) => c.author.id === msg.author.id && c.channel.id === msg.channel.id,
      );
    } catch (err) {
      if (err.message === 'WAITER TIMEOUT') {
        return msg.channel.createMessage('You did not respond. Deletion canceled.');
      }

      throw err;
    }

    const response = responseMsg.content.toLowerCase().trim();

    if (response !== 'confirm') {
      return msg.channel.createMessage('You did not say **confirm**, so your data has **not** been deleted.');
    }

    await msg.channel.createMessage('Deleting...');

    const dbUser = await UserModel.findOne({ 'discordUser.id': msg.author.id }, '_id').lean().exec();
    const dbUserId = dbUser?._id;

    if (dbUserId) {
      const customDecks = await CustomDeckModel.find({ owner: dbUserId }, 'shortName').lean().exec();
      await Promise.all(
        customDecks.map(async (customDeck) => {
          const deckPath = path.join(CUSTOM_DECK_DIR, `${customDeck.shortName}.json`);
          await fs.promises.unlink(deckPath)
            .catch((err) => monochrome.getLogger().error({ event: 'ERROR DELETING DECK', err }));

          await CustomDeckModel.deleteOne({ _id: customDeck._id }).exec();
        }),
      );

      await Promise.all([
        CustomDeckVoteModel.deleteMany({ voter: dbUserId }).exec(),
        ReportModel.updateMany({
          participants: dbUserId,
        }, {
          $pull: { participants: dbUserId, 'questions.$.correctAnswerers': dbUserId },
        }).exec(),
      ]);

      await ReportModel.deleteMany({ 'participants.0': { $exists: false } }).exec();
    }

    await Promise.all([
      monochrome.getSettings().resetUserSettings(msg.author.id),
      ScoreUtils.clearUserScores(msg.author.id),
    ]);

    if (dbUser) {
      await UserModel.deleteOne({ _id: dbUser._id }).exec();
    }

    return msg.channel.createMessage(`Your data has been deleted / scheduled for deletion. Deletion of database backup and log data may take up to 30 days. To opt out of all future data collection, use the **${msg.prefix}banme** command.`);
  },
};
