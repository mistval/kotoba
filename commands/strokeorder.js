'use strict'
const reload = require('require-reload')(require);
let strokeOrderLookup = reload('./../kotoba/stroke_order_lookup.js');

module.exports = {
  commandAliases: ['k!strokeorder', 'k!so'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'strokeorder303489',
  shortDescription: 'Search for details about a kanji\'s strokes.',
  longDescription: 'Search for details about a kanji\'s strokes. For most kanji, I will provide a sequential stroke order diagram from Jisho and a stroke order gif generated from KanjiVG data.',
  usageExample: 'k!strokeorder 少',
  action(bot, msg, suffix) {
    return strokeOrderLookup(suffix, bot, msg);
  },
};
