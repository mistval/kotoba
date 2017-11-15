'use strict'
const reload = require('require-reload')(require);
const dictionaryQuery = reload('./../kotoba/dictionary_query.js');
const jishoWordSearch = reload('./../kotoba/jisho_word_search.js');

module.exports = {
  commandAliases: ['k!j', '!j', 'k!en', 'k!ja', 'k!jp', 'k!ja-en', 'k!jp-en', 'k!en-jp', 'k!en-ja', '!ja', '!jp'],
  aliasesForHelp: ['k!j', '!j'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishoword403895',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for an English or Japanese word.',
  longDescription: 'Search Jisho for an English or Japanese word. Tip: sometimes Jisho will interpret your English search term as a Japanese word written in romaji. To force it to interpret your search term as English, put quotes around your search term. Example: k!j "gone"\n\nThere are two display modes. The default is \'big\' (unless your server admins have changed it). There is also \'small\'. Try both:\n\nk!j 少し --big\nk!j 少し --small\n\nServer admins can change the default display mode by using the k!settings command.',
  usageExample: 'k!j 少し',
  action(bot, msg, suffix, settings) {
    return dictionaryQuery(msg, 'en', 'ja', suffix, jishoWordSearch, settings['dictionary/display_mode']);
  },
};
