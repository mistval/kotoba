

const kitsuSearch = require('./../common/kitsu_anime_search.js');
const { throwPublicErrorInfo } = require('./../common/util/errors.js');

module.exports = {
  commandAliases: ['anime', 'a'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'kitsuanime92837',
  shortDescription: 'Search Kitsu.io for anime information.',
  longDescription: 'Search Kitsu.io for anime information, including synopsis, rating and favorite counts.',
  usageExample: '<prefix>anime Monster',
  async action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Kitsu Anime Search', `Say **${prefix}a [anime]** to search for anime on Kitsu.io. For example: **${prefix}a Monster**. Say **${prefix}help anime** for more help.`, 'No suffix');
    }

    return kitsuSearch.createNavigationForAnime(
      msg.author.username,
      msg.author.id,
      suffix,
      msg,
      monochrome.getNavigationManager(),
    );
  },
};
