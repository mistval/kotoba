const { Permissions } = require('monochrome-bot');
const youreiSearch = require('../common/yourei_search.js');
const { throwPublicErrorInfo } = require('../common/util/errors.js');

module.exports = {
  commandAliases: ['yourei', 'y'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'yourei92435',
  shortDescription: 'Search 用例.jp for more example sentences.',
  longDescription: 'Search 用例.jp for more Japanese example sentences, including usage frequency, and usage examples. There are no translation, though.',
  usageExample: '<prefix>yourei 少し',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Yourei', `Say **${prefix}y [word]** to search for example sentences on 用例.jp. For example: **${prefix}y 少し**. Say **${prefix}help yourei** for more help.`, 'No suffix');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    return youreiSearch.createNavigationForExamples(
      msg.author.username,
      msg.author.id,
      suffix,
      msg,
      monochrome.getNavigationManager(),
    );
  },
};
