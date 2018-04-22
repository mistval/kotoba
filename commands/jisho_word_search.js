const reload = require('require-reload')(require);

const jishoSearch = reload('./../kotoba/jisho_search.js');
const dictionaryQuery = reload('./../kotoba/dictionary_query.js');
const jishoWordSearch = reload('./../kotoba/jisho_word_search.js');
const constants = reload('./../kotoba/constants.js');
const { PublicError, navigationManager } = reload('monochrome-bot');

function createTitleOnlyEmbed(title) {
  return {
    embed: {
      title,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

module.exports = {
  commandAliases: ['k!j', '!j', 'k!en', 'k!ja', 'k!jp', 'k!ja-en', 'k!jp-en', 'k!en-jp', 'k!en-ja', '!ja', '!jp'],
  aliasesForHelp: ['k!j'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishoword403895',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for an English or Japanese word.',
  longDescription: 'Search Jisho for an English or Japanese word. Tip: sometimes Jisho will interpret your English search term as a Japanese word written in romaji. To force it to interpret your search term as English, put quotes around your search term. Example: k!j "gone"\n\nThere are two display modes. The default is \'big\' (unless your server admins have changed it). There is also \'small\'. Try both:\n\nk!j 少し --big\nk!j 少し --small\n\nServer admins can change the default display mode by using the k!settings command.',
  usageExample: 'k!j 少し',
  action: async function action(bot, msg, suffix, settings) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage(createTitleOnlyEmbed('Say \'k!j [text]\' to search for definitions. For example: k!j 瞬間'), false, 'No suffix');
    }

    let displayMode = settings['dictionary/display_mode'];
    if (suffix.indexOf('--small') !== -1) {
      displayMode = 'small';
    }
    if (suffix.indexOf('--big') !== -1) {
      displayMode = 'big';
    }

    const searchTerm = suffix.replace('--small', '').replace('--big', '');

    if (displayMode === 'small') {
      return dictionaryQuery(msg, 'en', 'ja', searchTerm, jishoWordSearch, displayMode);
    }

    const navigation = await jishoSearch.createNavigationForWord(
      msg.author.username,
      msg.author.id,
      searchTerm,
    );

    return navigationManager.register(navigation, 6000000, msg);
  },
};
