'use strict'
const persistence = require('./../core/persistence.js');

/**
* Demonstrates getting persisted data.
*/
module.exports = {
  commandAliases: ['bot!getquote', 'bot!gq'],
  canBeChannelRestricted: false,
  serverAdminOnly: false,
  action(bot, msg, suffix) {
    return persistence.getGlobalData().then(globalData => {
      if (!globalData.quotes) {
        return msg.channel.createMessage('There aren\'t any quotes yet :( Use the bot!addquote command to add some.');
      }

      let quoteIndex = Math.floor(Math.random() * globalData.quotes.length);
      let content = {};
      content.embed = {};
      content.embed.title = 'Random Quote';
      content.embed.description = '"' + globalData.quotes[quoteIndex].quote + '" - ' + globalData.quotes[quoteIndex].user;
      return msg.channel.createMessage(content);
    });
  },
};
