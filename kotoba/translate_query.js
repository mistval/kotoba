'use strict'
const reload = require('require-reload')(require);
const TranslationResult = reload('./translation_result.js');

function printHelp(bot, msg) {
  msg.channel.createMessage('Say \'k!gt [phrase]\' to search for translations of a phrase.');
}

module.exports = function(suffix, fromLanguage, toLanguage, queryFunction, bot, msg) {
  if (!suffix) {
    printHelp(bot, msg);
    return true;
  } else if (suffix.length > 400) {
    msg.channel.createMessage('Sorry, that\'s too long for me to translate. Visit <http://translate.google.com>.');
    return true;
  } else {
    return Promise.resolve(queryFunction(fromLanguage, toLanguage, suffix)).then(result => {
      return msg.channel.createMessage(result.toDiscordBotContent());
    }).catch(err => {
      if (err.publicMessage) {
        msg.channel.createMessage(err.publicMessage);
      }

      throw err;
    });
  }
};
