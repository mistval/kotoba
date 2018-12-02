const reload = require('require-reload')(require);

const jishoSearch = reload('./../common/jisho_search.js');
const errors = reload('./../common/util/errors.js');

module.exports = {
  commandAliases: ['strokeorder', 's', 'so'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'strokeorder303489',
  shortDescription: 'Search for details about a kanji\'s strokes.',
  longDescription: 'Search for details about a kanji\'s strokes. For most kanji, I will provide a sequential stroke order diagram from Jisho and a stroke order gif generated from KanjiVG data. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: '**<prefix>strokeorder 少**',
  action(erisBot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return errors.throwPublicErrorInfo('Stroke order', `Say **${prefix}strokeorder [kanji]** to search for stroke order information. For example: **${prefix}strokeorder 瞬間**. Say **${prefix}help strokeorder** for more help.`, 'No suffix');
    }

    return jishoSearch.createNavigationForStrokeOrder(
      msg,
      msg.author.username,
      msg.author.id,
      suffix,
      monochrome.getNavigationManager(),
    );
  },
};
