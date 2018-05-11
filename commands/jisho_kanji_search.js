const reload = require('require-reload')(require);

const jishoSearch = reload('./../kotoba/jisho_search.js');
const { throwPublicErrorInfo } = reload('./../kotoba/util/errors.js');

module.exports = {
  commandAliases: ['k!kanji', 'k!k'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  shortDescription: 'Search for information about a kanji.',
  longDescription: 'Search Jisho for information about a kanji character. For most kanji, I will show JLPT level, frequency information, readings, examples, and more. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: 'k!kanji 少',
  action(bot, msg, suffix) {
    if (!suffix) {
      return throwPublicErrorInfo('Kanji', 'Say **k!kanji [kanji]** to search for kanji. For example: **k!kanji 瞬間**. Say **k!help kanji** for more help.', 'No suffix');
    }

    return jishoSearch.createNavigationForKanji(
      msg,
      msg.author.username,
      msg.author.id,
      suffix,
    );
  },
};
