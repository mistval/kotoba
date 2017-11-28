'use strict'
const reload = require('require-reload')(require);
const jishoSearch = reload('./../kotoba/jisho_search.js');
const PublicError = reload('monochrome-bot').PublicError;
const navigationManager = reload('monochrome-bot').navigationManager;
const dictionaryQuery = reload('./../kotoba/dictionary_query.js');
const jishoWordSearch = reload('./../kotoba/jisho_word_search.js');
const constants = require('./../kotoba/constants.js');

function createTitleOnlyEmbed(title) {
  return {
    embed: {
      title: title,
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
  action(bot, msg, suffix, settings) {
    if (!suffix) {
      return msg.channel.createMessage(createTitleOnlyEmbed(`Say 'k!j [text]' to search for definitions. For example: k!j 瞬間`));
    }

    let displayMode;
    if (suffix.indexOf('--small') !== -1) {
      displayMode = 'small';
    }
    if (suffix.indexOf('--big') !== -1) {
      displayMode = 'big';
    }
    suffix = suffix.replace('--small', '').replace('--big', '');

    displayMode = displayMode || settings['dictionary/display_mode'];
    if (displayMode === 'small') {
      return dictionaryQuery(msg, 'en', 'ja', suffix, jishoWordSearch, displayMode);
    }
    return jishoSearch.createNavigationForWord(msg.author.username, msg.author.id, suffix).then(navigation => {
      navigationManager.register(navigation, 6000000, msg);
    });
  },
};
