const { Permissions, PaginatedMessage } = require('monochrome-bot');
const { throwPublicErrorInfo } = require('../common/util/errors.js');
const createStrokeOrderNavigationChapter = require('../discord/create_stroke_order_search_navigation_chapter.js');

module.exports = {
  commandAliases: ['strokeorder', 's', 'so'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'strokeorder303489',
  shortDescription: 'Search for details about a kanji\'s strokes.',
  longDescription: 'Search for details about a kanji\'s strokes. For most kanji, I will provide a sequential stroke order diagram from Jisho and a stroke order gif generated from KanjiVG data. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: '<prefix>strokeorder 少',
  requiredBotPermissions: [
    Permissions.attachFiles,
    Permissions.embedLinks,
    Permissions.sendMessages,
  ],
  interaction: {
    compatibilityMode: true,
    options: [{
      name: 'kanji',
      description: 'The kanji to search for',
      type: 3,
      required: true,
    }],
  },
  action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Stroke Order Search', `Say **${prefix}strokeorder [kanji]** to search for stroke order information. For example: **${prefix}strokeorder 瞬間**. Say **${prefix}help strokeorder** for more help.`, 'No suffix');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const { navigationChapter } = createStrokeOrderNavigationChapter(
      suffix,
      msg.author.username,
      false,
    );

    const navigationChapters = [{ title: '', getPages: (i) => navigationChapter.getPageFromPreparedData(undefined, i) }];
    const paginatedMessageId = `jisho_stroke_order_"${suffix}"`;

    return PaginatedMessage.sendAsMessageReply(msg, navigationChapters, { id: paginatedMessageId });
  },
};
