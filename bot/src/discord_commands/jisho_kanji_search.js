const { throwPublicErrorInfo } = require('./../common/util/errors.js');
const createKanjiDataSource = require('./../discord/create_kanji_search_data_source.js');
const { Navigation, NavigationChapter } = require('monochrome-bot');
const constants = require('./../common/constants.js');

module.exports = {
  commandAliases: ['kanji', 'k'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  shortDescription: 'Search for information about a kanji.',
  longDescription: 'Search Jisho for information about a kanji character. For most kanji, I will show JLPT level, frequency information, readings, examples, and more. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: '<prefix>kanji 少',
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Kanji', `Say **${prefix}kanji [kanji]** to search for kanji. For example: **${prefix}kanji 瞬間**. Say **${prefix}help kanji** for more help.`, 'No suffix');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const dataSource = await createKanjiDataSource(
      suffix,
      msg.author.username,
      msg.prefix,
      false,
    );

    const navigationChapter = new NavigationChapter(dataSource);
    const pageCount = await dataSource.countPages();

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
