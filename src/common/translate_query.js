'use strict'
const reload = require('require-reload')(require);
const globals = require('./globals.js');
const TranslationResult = reload('./translation_result.js');

module.exports = function(suffix, fromLanguage, toLanguage, queryFunction, bot, msg) {
  if (suffix.length > 600) {
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
