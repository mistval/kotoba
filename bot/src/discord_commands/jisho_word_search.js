const { Permissions } = require('monochrome-bot');
const jishoSearch = require('../discord/jisho_search.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = require('../common/util/errors.js');
const { PaginatedMessage } = require('../discord/components/paginated_message.js');

module.exports = {
  commandAliases: ['jisho', 'j', 'en', 'ja', 'jp', 'ja-en', 'jp-en', 'en-jp', 'en-ja'],
  aliasesForHelp: ['jisho', 'j'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishoword403895',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for an English or Japanese word.',
  longDescription: 'Search Jisho for an English or Japanese word. Tip: sometimes Jisho will interpret your English search term as a Japanese word written in romaji. To force it to interpret your search term as English, put quotes around your search term. Example: <prefix>jisho "gone"\n\nThere are two display modes. The default is \'big\' (unless your server admins have changed it). There is also \'small\'. Try both:\n\n<prefix>jisho 少し --big\n<prefix>jisho 少し --small\n\nServer admins can change the default display mode by using the <prefix>settings command.',
  usageExample: '<prefix>j 少し',
  requiredBotPermissions: [
    Permissions.attachFiles,
    Permissions.embedLinks,
    Permissions.sendMessages,
  ],
  interaction: {
    compatibilityMode: true,
    options: [{
      name: 'word',
      description: 'The word/phrase to search for',
      type: 3,
      required: true,
    }],
  },
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
      );

      const paginatedMessageId = `jisho_all_"${searchTerm}"_${big ? 'big' : 'small'}`;
      return PaginatedMessage.sendAsMessageReply(msg, navigation, { id: paginatedMessageId });
    }

    const result = await jishoSearch.createSmallResultForWord(searchTerm);
    return msg.channel.createMessage(result, null, msg);
  },
};
