/*
 * This code is no longer maintained.
 * It is still used for Glosbe dictionary searches.
 * If it breaks, the Glosbe dictionary search
 * feature may be removed from the bot.
 */


const prettyLanguageForLanguageCode = require('./language_code_maps.js').prettyLanguageForGlosbeLanguageCode;
const DictionaryResponseData = require('./dictionary_response_data.js');
const PublicError = require('monochrome-bot').PublicError;

function getHelp(langStr, fromLanguage, toLanguage) {
  let fromLanguagePretty = prettyLanguageForLanguageCode[fromLanguage];
  let toLanguagePretty = prettyLanguageForLanguageCode[toLanguage];
  if (!fromLanguagePretty || !toLanguagePretty) {
    return;
  }
  return 'Say \'k!' + langStr + ' [word]\' to search for ' + toLanguagePretty + ' definitions of a ' + fromLanguagePretty + ' word.';
}

function throwSyntaxError(publicMessage) {
  throw PublicError.createWithCustomPublicMessage(publicMessage, false, 'Bad syntax');
}

module.exports = function(msg, fromLanguage, toLanguage, term, queryFunction, defaultSize) {
  let big = defaultSize === 'big';
  if (term.indexOf('--small') !== -1) {
    big = false;
  }
  if (term.indexOf('--big') !== -1) {
    big = true;
  }
  term = term.replace('--small', '').replace('--big', '');
  if (typeof fromLanguage === typeof '') {
    let autoSetToLanguage = typeof toLanguage !== 'string';

    if (autoSetToLanguage) {
      if (fromLanguage !== 'en') {
        toLanguage = 'en';
      } else {
        toLanguage = 'ja';
      }
    }

    let fromLanguagePretty = prettyLanguageForLanguageCode[fromLanguage];
    let toLanguagePretty = prettyLanguageForLanguageCode[toLanguage];

    if (!fromLanguagePretty || !toLanguagePretty) {
      return false;
    }

    if (!term) {
      if (autoSetToLanguage) {
        throwSyntaxError(getHelp(fromLanguage, fromLanguage, toLanguage));
      } else {
        throwSyntaxError(getHelp(fromLanguage + '-' + toLanguage, fromLanguage, toLanguage));
      }
    } else {
      return queryFunction(fromLanguage, toLanguage, term).then(result => {
        return msg.channel.createMessage(result.toDiscordBotContent(big), null, msg);
      });
    }

    return true;
  }
};
