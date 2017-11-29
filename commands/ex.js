'use strict'
const reload = require('require-reload')(require);
const searchExamples = new (require('unofficial-jisho-api'))().searchForExamples;
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
  commandAliases: ['k!examples', 'k!ex'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'examples53059',
  shortDescription: 'Search Jisho for example sentences.',
  usageExample: 'k!examples 少し',
  action(bot, msg, suffix) {
    if (!suffix) {
      return msg.channel.createMessage(createTitleOnlyEmbed(`Say 'k!examples [text]' to search for examples. For example: k!examples 瞬間`));
    }
    return jishoSearch.createNavigationForExamples(msg.author.username, msg.author.id, suffix).then(navigation => {
      return navigationManager.register(navigation, 6000000, msg);
    });
  },
};
