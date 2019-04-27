const reload = require('require-reload')(require);

const jishoSearch = reload('./../common/jisho_search.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

module.exports = {
  commandAliases: ['examples', 'ex'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'examples53059',
  shortDescription: 'Search Jisho for example sentences.',
  usageExample: '<prefix>examples 少し',
  action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Examples', `Say **${prefix}examples [text]** to search for examples. For example: **${prefix}examples 瞬間**`, 'No suffix');
    }

    return jishoSearch.createNavigationForExamples(
      msg,
      msg.author.username,
      msg.author.id,
      suffix,
      monochrome.getNavigationManager(),
    );
  },
};
