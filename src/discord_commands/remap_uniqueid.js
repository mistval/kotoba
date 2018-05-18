const reload = require('require-reload')(require);

const decksMetadata = reload('./../../generated/quiz/decks.json');
const { persistence } = reload('monochrome-bot');

const deckUniqueIdMap = {};
Object.keys(decksMetadata).forEach((deckName) => {
  deckUniqueIdMap[decksMetadata[deckName].uniqueId] = true;
});

module.exports = {
  commandAliases: ['}remapuid'],
  botAdminOnly: true,
  hidden: true,
  action: async function action(erisBot, monochrome, msg, suffix) {
    const args = suffix.split('/');
    const fromId = args[0];
    const toId = args[1];
    if (args.length !== 2) {
      return msg.channel.createMessage('Incorrect number of args');
    }
    if (!deckUniqueIdMap[toId]) {
      return msg.channel.createMessage('Deck with desired toId doesn\'t exist.');
    }

    await persistence.editGlobalData((data) => {
      data.quizScores.forEach((row) => {
        // We want fuzzy comparison here because some of the old
        // deck unique ids are numbers (which is bad, but they
        // are all strings now)
        // eslint-disable-next-line eqeqeq
        if (row.deckId == fromId) {
          // Hotspot. Don't want to copy.
          // eslint-disable-next-line no-param-reassign
          row.deckId = toId;
        }
      });

      return data;
    });

    return msg.channel.createMessage(`Remapped **${fromId}** to **${toId}**`, null, msg);
  },
};
