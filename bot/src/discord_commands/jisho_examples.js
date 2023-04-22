const { Permissions } = require('monochrome-bot');
const { throwPublicErrorInfo } = require('../common/util/errors.js');
const createExampleSearchPages = require('../discord/create_example_search_pages.js');
const { PaginatedMessage } = require('../discord/components/paginated_message.js');

module.exports = {
  commandAliases: ['examples', 'ex'],
  cooldown: 3,
  uniqueId: 'examples53059',
  shortDescription: 'Search Jisho for example sentences.',
  usageExample: '<prefix>examples 少し',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  interaction: {
    compatibilityMode: true,
    options: [{
      name: 'word',
      description: 'The word/phrase to search for',
      type: 3,
      required: true,
    }],
  },
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Examples', `Say **${prefix}examples [text]** to search for examples. For example: **${prefix}examples 瞬間**`, 'No suffix');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const pages = await createExampleSearchPages(suffix);
    const navigationChapters = [{ title: '', pages }];
    return PaginatedMessage.sendAsMessageReply(msg, navigationChapters);
  },
};
