const reload = require('require-reload')(require);

const jishoSearch = reload('./../kotoba/jisho_search.js');
const { throwPublicErrorInfo } = reload('./../kotoba/util/errors.js');

module.exports = {
  commandAliases: ['k!jn'],
  aliasesForHelp: ['k!jn'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishowordjn64054',
  shortDescription: 'The same as k!jisho, but without command buttons, in case you don\'t like them!',
  longDescription: 'Search Jisho for an English or Japanese word. Tip: sometimes Jisho will interpret your English search term as a Japanese word written in romaji. To force it to interpret your search term as English, put quotes around your search term. Example: k!j "gone"\n\nThere are two display modes. The default is \'big\' (unless your server admins have changed it). There is also \'small\'. Try both:\n\nk!j 少し --big\nk!j 少し --small\n\nServer admins can change the default display mode by using the k!settings command.',
  usageExample: 'k!jn 少し',
  action: async function action(bot, msg, suffix) {
    if (!suffix) {
      return throwPublicErrorInfo('Jisho', 'Say **k!jn [word]** to search for words on Jisho.org. For example: **k!jn 瞬間**. Say **k!help jisho** for more help.', 'No suffix');
    }

    return jishoSearch.createOnePageBigResultForWord(msg, suffix);
  },
};
