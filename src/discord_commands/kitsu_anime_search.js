const reload = require('require-reload')(require);

const kitsuSearch = reload('./../common/kitsu_anime_search.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

module.exports = {
  commandAliases: ['kitsu'],
  aliasesForHelp: ['kitsu'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'kitsuanime92837',
  shortDescription: 'Search Kitsu.io for anime information.',
  longDescription: 'Search Kitsu.io for anime information, including synopsis, rating and favorite counts.',
  usageExample: '<prefix>kitsu Monster',
  action: async function action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Kitsu Anime Search', `Say **${prefix}kitsu [anime]** to search for anime on Kitsu.io. For example: **${prefix}kitsu Monster**. Say **${prefix}help kitsu** for more help.`, 'No suffix');
    }

    return kitsuSearch.createAnimeResult(
      msg.author.username,
      msg.author.id, 
      suffix, 
      msg, 
      monochrome.getNavigationManager());
  },
};
