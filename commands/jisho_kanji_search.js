'use strict'
const reload = require('require-reload')(require);
let lookupKanji = reload('./../kotoba/kanji_lookup.js');

module.exports = {
  commandAliases: ['k!kanji', 'k!k'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  shortDescription: 'Search for information about a kanji.',
  longDescription: 'Search Jisho for information about a kanji character. Only one character can be searched at a time. If you enter more than one character as your search term, only the first character will be searched.',
  usageExample: 'k!kanji 少',
  action(bot, msg, suffix) {
    return lookupKanji(suffix, bot, msg);
  },
};
