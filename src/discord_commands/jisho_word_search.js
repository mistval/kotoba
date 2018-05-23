const reload = require('require-reload')(require);

const jishoSearch = reload('./../common/jisho_search.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

module.exports = {
  commandAliases: ['k!jisho', 'k!j', '!j', 'k!en', 'k!ja', 'k!jp', 'k!ja-en', 'k!jp-en', 'k!en-jp', 'k!en-ja'],
  aliasesForHelp: ['k!jisho', 'k!j'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishoword403895',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for an English or Japanese word.',
  longDescription: 'Search Jisho for an English or Japanese word. Tip: sometimes Jisho will interpret your English search term as a Japanese word written in romaji. To force it to interpret your search term as English, put quotes around your search term. Example: k!j "gone"\n\nThere are two display modes. The default is \'big\' (unless your server admins have changed it). There is also \'small\'. Try both:\n\nk!j 少し --big\nk!j 少し --small\n\nServer admins can change the default display mode by using the k!settings command.',
  usageExample: 'k!j 少し',
  action: async function action(erisBot, msg, suffix, monochrome, settings) {
    if (!suffix) {
      return throwPublicErrorInfo('Jisho', 'Say **k!j [word]** to search for words on Jisho.org. For example: **k!j 瞬間**. Say **k!help jisho** for more help.', 'No suffix');
    }

    let big = settings['dictionary/display_mode'] === 'big';
    if (suffix.indexOf('--small') !== -1) {
      big = false;
    } else if (suffix.indexOf('--big') !== -1) {
      big = true;
    }

    const searchTerm = suffix.replace(/--small/g, '').replace(/--big/g, '');

    if (big) {
      return jishoSearch.createNavigationForWord(
        msg.author.username,
        msg.author.id,
        searchTerm,
        msg,
        monochrome.getNavigationManager(),
      );
    }
    return jishoSearch.createSmallResultForWord(msg, searchTerm);
  },
};
