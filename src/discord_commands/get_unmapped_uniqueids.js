const reload = require('require-reload')(require);

const ScoreStorageUtils = reload('./../common/quiz/score_storage_utils.js');
const decksMetadata = reload('./../../generated/quiz/decks.json');

const deckUniqueIdMap = {};
Object.keys(decksMetadata).forEach((deckName) => {
  deckUniqueIdMap[decksMetadata[deckName].uniqueId] = true;
});

module.exports = {
  commandAliases: ['}unmappeduids'],
  botAdminOnly: true,
  hidden: true,
  action: async function action(erisBot, monochrome, msg) {
    const allScores = await ScoreStorageUtils.getGlobalScores();
    const unmappedUniqueIds = [];

    allScores.forEach((score) => {
      if (
        !deckUniqueIdMap[score.deckId] &&
        unmappedUniqueIds.indexOf(score.deckId) === -1
      ) {
        unmappedUniqueIds.push(score.deckId);
      }
    });

    return msg.channel.createMessage(JSON.stringify(unmappedUniqueIds), null, msg);
  },
};
