'use strict'
const reload = require('require-reload')(require);
let lookupKanji = reload('./../kotoba/kanji_lookup.js');

module.exports = {
  commandAliases: ['k!k', 'k!kanji'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  action(bot, msg, suffix) {
    return lookupKanji(suffix, bot, msg);
  },
};
