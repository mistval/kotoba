const reload = require('require-reload')(require);

const jishoSearch = reload('./../common/jisho_search.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

module.exports = {
  commandAliases: ['kanji', 'k'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  shortDescription: 'Search for information about a kanji.',
  longDescription: 'Search Jisho for information about a kanji character. For most kanji, I will show JLPT level, frequency information, readings, examples, and more. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: '<prefix>kanji 少',
  action(erisBot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Kanji', `Say **${prefix}kanji [kanji]** to search for kanji. For example: **${prefix}kanji 瞬間**. Say **${prefix}help kanji** for more help.`, 'No suffix');
    }

    return jishoSearch.createNavigationForKanji(
      msg,
      msg.author.username,
      msg.author.id,
      suffix,
      monochrome.getNavigationManager(),
    );
  },
};
