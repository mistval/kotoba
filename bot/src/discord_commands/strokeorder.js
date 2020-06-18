const { throwPublicErrorInfo } = require('./../common/util/errors.js');
const createStrokeOrderNavigationChapter = require('./../discord/create_stroke_order_search_navigation_chapter.js');
const { Navigation } = require('monochrome-bot');
const constants = require('./../common/constants.js');

module.exports = {
  commandAliases: ['strokeorder', 's', 'so'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'strokeorder303489',
  shortDescription: 'Search for details about a kanji\'s strokes.',
  longDescription: 'Search for details about a kanji\'s strokes. For most kanji, I will provide a sequential stroke order diagram from Jisho and a stroke order gif generated from KanjiVG data. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: '<prefix>strokeorder 少',
  action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Stroke Order Search', `Say **${prefix}strokeorder [kanji]** to search for stroke order information. For example: **${prefix}strokeorder 瞬間**. Say **${prefix}help strokeorder** for more help.`, 'No suffix');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const { navigationChapter, pageCount } = createStrokeOrderNavigationChapter(
      suffix,
      msg.author.username,
      false,
    );

    const navigation = Navigation.fromOneNavigationChapter(
      msg.author.id,
      navigationChapter,
      pageCount > 1,
    );

    return monochrome.getNavigationManager().show(
      navigation,
      constants.NAVIGATION_EXPIRATION_TIME,
      msg.channel,
      msg,
    );
  },
};
