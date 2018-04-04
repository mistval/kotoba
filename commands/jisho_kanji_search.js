
const reload = require('require-reload')(require);

const jishoSearch = reload('./../kotoba/jisho_search.js');
const navigationManager = reload('monochrome-bot').navigationManager;
const constants = require('./../kotoba/constants.js');

const PublicError = reload('monochrome-bot').PublicError;

function createTitleOnlyEmbed(title) {
  return {
    embed: {
      title,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

module.exports = {
  commandAliases: ['k!kanji', 'k!k'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  shortDescription: 'Search for information about a kanji.',
  longDescription: 'Search Jisho for information about a kanji character. For most kanji, I will show JLPT level, frequency information, readings, examples, and more. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: 'k!kanji 少',
  action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage(createTitleOnlyEmbed('Say \'k!kanji [kanji]\' to search for kanji. For example: k!kanji 瞬間'), false, 'No suffix');
    }
    return jishoSearch.createNavigationForKanji(msg.author.username, msg.author.id, suffix).then(navigation => navigationManager.register(navigation, 6000000, msg));
  },
};
