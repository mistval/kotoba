const reload = require('require-reload')(require);

const jishoSearch = reload('./../kotoba/jisho_search.js');
const { throwPublicErrorInfo } = reload('./../kotoba/util/errors.js');
const { navigationManager } = reload('monochrome-bot');

module.exports = {
  commandAliases: ['k!examples', 'k!ex'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'examples53059',
  shortDescription: 'Search Jisho for example sentences.',
  usageExample: 'k!examples 少し',
  action(bot, msg, suffix) {
    if (!suffix) {
      return throwPublicErrorInfo('Examples', 'Say **k!examples [text]** to search for examples. For example: **k!examples 瞬間**', 'No suffix');
    }

    return jishoSearch.createNavigationForExamples(
      msg,
      msg.author.username,
      msg.author.id,
      suffix,
    );
  },
};
