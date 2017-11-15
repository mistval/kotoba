'use strict'
const reload = require('require-reload')(require);
let jishoScreenScraper = reload('./../kotoba/jisho_screen_scraper.js');
let exampleQuery = reload('../kotoba/example_query.js');

module.exports = {
  commandAliases: ['k!examples', 'k!ex'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'examples53059',
  shortDescription: 'Search Jisho for example sentences.',
  usageExample: 'k!examples 少し',
  action(bot, msg, suffix) {
    return exampleQuery('ja', suffix, jishoScreenScraper.searchExamples, bot, msg);
  },
};
