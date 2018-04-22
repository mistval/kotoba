const reload = require('require-reload')(require);

const jishoSearch = reload('./../kotoba/jisho_search.js');
const { navigationManager, PublicError } = reload('monochrome-bot');
const constants = reload('./../kotoba/constants.js');

function createTitleOnlyEmbed(title) {
  return {
    embed: {
      title,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

module.exports = {
  commandAliases: ['k!examples', 'k!ex'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'examples53059',
  shortDescription: 'Search Jisho for example sentences.',
  usageExample: 'k!examples 少し',
  action: async function action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage(createTitleOnlyEmbed('Say \'k!examples [text]\' to search for examples. For example: k!examples 瞬間'), false, 'No suffix');
    }

    const navigation = await jishoSearch.createNavigationForExamples(
      msg.author.username,
      msg.author.id,
      suffix,
    );

    return navigationManager.register(navigation, 6000000, msg);
  },
};
