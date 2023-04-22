const { Permissions } = require('monochrome-bot');
const { PaginatedMessage } = require('../discord/components/paginated_message.js');
const createPagesForAnime = require('../discord/create_anime_search_navigation.js');
const { throwPublicErrorInfo } = require('../common/util/errors.js');

module.exports = {
  commandAliases: ['anime', 'a'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'kitsuanime92837',
  shortDescription: 'Search Kitsu.io for anime information.',
  longDescription: 'Search Kitsu.io for anime information, including synopsis, rating and favorite counts.',
  usageExample: '<prefix>anime Monster',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  interaction: {
    compatibilityMode: true,
    options: [{
      name: 'title',
      description: 'The title of the anime to search for',
      type: 3,
      required: true,
    }],
  },
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Kitsu Anime Search', `Say **${prefix}a [anime]** to search for anime on Kitsu.io. For example: **${prefix}a Monster**. Say **${prefix}help anime** for more help.`, 'No suffix');
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const pages = await createPagesForAnime(
      suffix,
    );

    const interactiveMessageId = `anime_search_"${suffix}"`;
    return PaginatedMessage.sendAsMessageReply(msg, [{ title: '', pages }], { id: interactiveMessageId });
  },
};
