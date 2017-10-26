'use strict'
const reload = require('require-reload')(require);
const dictionaryQuery = reload('./../kotoba/dictionary_query.js');
const jishoWordSearch = reload('./../kotoba/jisho_word_search.js');

module.exports = {
  commandAliases: ['k!en', 'k!ja', 'k!jp', 'k!ja-en', 'k!jp-en', 'k!en-jp', 'k!en-ja', '!j', 'k!j', '!ja', '!jp'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishoword403895',
  action(bot, msg, suffix) {
    return dictionaryQuery(msg, 'en', 'ja', suffix, jishoWordSearch);
  },
};
