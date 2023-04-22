const { Permissions } = require('monochrome-bot');
const { throwPublicErrorInfo } = require('../common/util/errors.js');
const createKanjiDataSource = require('../discord/create_kanji_search_data_source.js');
const { PaginatedMessage } = require('../discord/components/paginated_message.js');

module.exports = {
  commandAliases: ['kanji', 'k'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  shortDescription: 'Search Jisho for information about a kanji.',
  longDescription: 'Search Jisho for information about a kanji character. For most kanji, I will show JLPT level, frequency information, readings, examples, and more. If you enter more than one character, I\'ll show results for all of them.',
  usageExample: '<prefix>kanji 少',
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

    const navigationChapters = [{ title: '', getPages: (i) => dataSource.getPageFromPreparedData(undefined, i) }];
    return PaginatedMessage.sendAsMessageReply(msg, navigationChapters);
  },
};
