'use strict'
const persistence = require('./../core/persistence.js');

/**
* Demonstrates getting persisted data.
*/
module.exports = {
  commandAliases: ['bot!getquote', 'bot!gq'],
  canBeChannelRestricted: false,
  serverAdminOnly: false,
  uniqueId: 'getQuote45954',
  shortDescription: 'Get a random quote from my database.',
  longDescription: 'Get a random quote from my database. I will randomly select a quote from among the quotes stored with the bot!addquote command.',
  action(bot, msg, suffix, settings, extension) {
    return persistence.getGlobalData().then(globalData => {
      if (!globalData.quotes) {
        return msg.channel.createMessage('There aren\'t any quotes yet :( Use the bot!addquote command to add some.');
      }

      let quoteIndex = Math.floor(Math.random() * globalData.quotes.length);
      if (extension === '-newest') {
        quoteIndex = globalData.quotes.length - 1;
      }

      let content = {};
      content.embed = {};
      content.embed.title = 'Random Quote';
      content.embed.description = '"' + globalData.quotes[quoteIndex].quote + '" - ' + globalData.quotes[quoteIndex].user;
      return msg.channel.createMessage(content);
    });
  },
  canHandleExtension(extension) {
    return extension === '-newest';
  }
};
