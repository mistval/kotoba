'use strict'
const persistence = require('monochrome-bot').persistence;
const PublicError = require('monochrome-bot').PublicError;

/**
* Demonstrates persisting data.
*/
module.exports = {
  commandAliases: ['bot!addquote', 'bot!aq'],
  canBeChannelRestricted: true,
  uniqueId: 'addQuoteCommand490340259',
  serverAdminOnly: false,
  shortDescription: 'Add a quote to my database.',
  usageExample: '}addquote I\'m not very quotable',
  action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage('You gotta give me a quote to add!', true, 'No argument');
    }
    return persistence.editGlobalData(globalData => {
      if (!globalData.quotes) {
        globalData.quotes = [];
      }
      globalData.quotes.push({user: msg.author.username, quote: suffix});
      return globalData;
    }).then(() => {
      return msg.channel.createMessage('Quote added!');
    });
  },
};
