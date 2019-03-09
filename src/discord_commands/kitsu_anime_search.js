const reload = require('require-reload')(require);

const kitsuSearch = reload('./../common/kitsu_anime_search.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = reload('./../common/util/errors.js');

module.exports = {
  commandAliases: ['kitsu'],
  aliasesForHelp: ['kitsu'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'kitsuanime92837',
  shortDescription: 'Search Kitsu for anime data.',
  longDescription: 'Search Kitsu for anime data. This description should be longer, though...',
  usageExample: '<prefix>kitsu one piece',
  action: async function action(bot, msg, suffix, monochrome) {
    if (!suffix) {
      return throwPublicErrorInfo('Kitsu Anime', 'This feature is not yet implemented. \n--Alkh', 'WIP');
    }

    return kitsuSearch.createAnimeResult(
      msg.author.username,
      msg.author.id, 
      suffix, 
      msg, 
      monochrome.getNavigationManager());
  },
};
