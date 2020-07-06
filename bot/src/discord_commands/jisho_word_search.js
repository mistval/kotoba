const jishoSearch = require('./../discord/jisho_search.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = require('./../common/util/errors.js');
const constants = require('./../common/constants.js');
const { Permissions } = require('monochrome-bot');

module.exports = {
  commandAliases: ['jisho', 'j', 'en', 'ja', 'jp', 'ja-en', 'jp-en', 'en-jp', 'en-ja'],
  aliasesForHelp: ['jisho', 'j'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishoword403895',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for an English or Japanese word.',
  longDescription: 'Search Jisho for an English or Japanese word. Tip: sometimes Jisho will interpret your English search term as a Japanese word written in romaji. To force it to interpret your search term as English, put quotes around your search term. Example: <prefix>jn "gone"\n\nThere are two display modes. The default is \'big\' (unless your server admins have changed it). There is also \'small\'. Try both:\n\n<prefix>jn 少し --big\n<prefix>j 少し --small\n\nServer admins can change the default display mode by using the <prefix>settings command.',
  usageExample: '<prefix>j 少し',
  requiredBotPermissions: [Permissions.attachFiles, Permissions.embedLinks, Permissions.sendMessages],
  async action(bot, msg, suffix, monochrome, settings) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Jisho', `Say **${prefix}j [word]** to search for words on Jisho.org. For example: **${prefix}j 瞬間**. Say **${prefix}help jisho** for more help.`, 'No suffix');
    }

    if (suffix.length > 100) {
      return throwPublicErrorFatal('Jisho', 'That query is too long. The maximum length is 100 characters.', 'Too long');
    }

    let big = settings['dictionary/display_mode'] === 'big';
    if (suffix.indexOf('--small') !== -1) {
      big = false;
    } else if (suffix.indexOf('--big') !== -1) {
      big = true;
    }

    const searchTerm = suffix.replace(/--small/g, '').replace(/--big/g, '');

    if (big) {
      monochrome.updateUserFromREST(msg.author.id).catch(() => {});

      const navigation = await jishoSearch.createNavigationForWord(
        msg.author.username,
        msg.author.id,
        searchTerm,
        msg,
        monochrome.getNavigationManager(),
      );

      return monochrome.getNavigationManager().show(
        navigation,
        constants.NAVIGATION_EXPIRATION_TIME,
        msg.channel,
        msg,
      );
    }

    const result = await jishoSearch.createSmallResultForWord(searchTerm);
    return msg.channel.createMessage(result, null, msg);
  },
};
