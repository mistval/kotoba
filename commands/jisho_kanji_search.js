'use strict'
const reload = require('require-reload')(require);
const jishoSearch = reload('./../kotoba/jisho_search.js');
const navigationManager = reload('monochrome-bot').navigationManager;
const constants = require('./../kotoba/constants.js');


function createTitleOnlyEmbed(title) {
  return {
    embed: {
      title: title,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };
}

module.exports = {
  commandAliases: ['k!kanji', 'k!k'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishokanji54094',
  shortDescription: 'Search for information about a kanji.',
  longDescription: 'Search Jisho for information about a kanji character. Only one character can be searched at a time. If you enter more than one character as your search term, only the first character will be searched.',
  usageExample: 'k!kanji 少',
  action(bot, msg, suffix) {
    if (!suffix) {
      return msg.channel.createMessage(createTitleOnlyEmbed(`Say 'k!kanji [kanji]' to search for kanji. For example: k!kanji 瞬間`));
    }
    return jishoSearch.createNavigationForKanji(msg.author.username, msg.author.id, suffix).then(navigation => {
      navigationManager.register(navigation, 6000000, msg);
    });
  },
};
