'use strict'
const reload = require('require-reload')(require);
const TranslationResult = reload('./translation_result.js');

function printHelp(bot, msg) {
  msg.channel.createMessage('Say \'k!gt [phrase]\' to search for translations of a phrase.', null, msg);
}

module.exports = function(suffix, fromLanguage, toLanguage, queryFunction, bot, msg) {
  if (!suffix) {
    printHelp(bot, msg);
    return true;
  } else if (suffix.length > 600) {
    msg.channel.createMessage('Sorry, that\'s too long for me to translate. Visit <http://translate.google.com>.', null, msg);
    return true;
  } else {
    return Promise.resolve(queryFunction(fromLanguage, toLanguage, suffix)).then(result => {
      return msg.channel.createMessage(result.toDiscordBotContent(), null, msg);
    }).catch(err => {
      if (err.publicMessage) {
        msg.channel.createMessage(err.publicMessage, null, msg);
      }

      throw err;
    });
  }
};
