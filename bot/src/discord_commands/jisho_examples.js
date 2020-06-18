const { throwPublicErrorInfo } = require('./../common/util/errors.js');
const createExampleSearchPages = require('./../discord/create_example_search_pages.js');
const addPaginationFooter = require('./../discord/add_pagination_footer.js');
const { Navigation } = require('monochrome-bot');
const constants = require('./../common/constants.js');

module.exports = {
  commandAliases: ['examples', 'ex'],
  cooldown: 3,
  uniqueId: 'examples53059',
  shortDescription: 'Search Jisho for example sentences.',
  usageExample: '<prefix>examples 少し',
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Examples', `Say **${prefix}examples [text]** to search for examples. For example: **${prefix}examples 瞬間**`, 'No suffix');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    let pages = await createExampleSearchPages(suffix);
    if (pages.length > 1) {
      pages = addPaginationFooter(pages, msg.author.username);
    }

    const navigation = Navigation.fromOneDimensionalContents(msg.author.id, pages);

    return monochrome.getNavigationManager().show(
      navigation,
      constants.NAVIGATION_EXPIRATION_TIME,
      msg.channel,
      msg,
    );
  },
};
