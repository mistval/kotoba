const reload = require('require-reload')(require);

const jishoSearch = reload('./../kotoba/jisho_search.js');
const { navigationManager } = reload('monochrome-bot');
const errors = reload('./../kotoba/util/errors.js');

module.exports = {
  commandAliases: ['k!strokeorder', 'k!s', 'k!so'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'strokeorder303489',
  shortDescription: 'Search for details about a kanji\'s strokes.',
  longDescription: 'Search for details about a kanji\'s strokes. For most kanji, I will provide a sequential stroke order diagram from Jisho and a stroke order gif generated from KanjiVG data. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: 'k!strokeorder 少',
  action(bot, msg, suffix) {
    if (!suffix) {
      return errors.throwPublicErrorInfo('Stroke order', 'Say **k!strokeorder [kanji]** to search for stroke order information. For example: **k!strokeorder 瞬間**. Say **k!help strokeorder** for more help.', 'No suffix');
    }

    return jishoSearch.createNavigationForStrokeOrder(
      msg,
      msg.author.username,
      msg.author.id,
      suffix,
    );
  },
};
