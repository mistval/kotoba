'use strict'
const reload = require('require-reload')(require);
const prettyLanguageForLanguageCode = reload('./language_code_maps.js').prettyLanguageForGlosbeLanguageCode;
const DictionaryResponseData = reload('./dictionary_response_data.js');
const KotobaUtils = reload('./utils.js');
const NavigationPage = reload('./../core/navigation_page.js');
const ResponseStatus = reload('./dictionary_response_status.js');

function getHelp(langStr, fromLanguage, toLanguage) {
  let fromLanguagePretty = prettyLanguageForLanguageCode[fromLanguage];
  let toLanguagePretty = prettyLanguageForLanguageCode[toLanguage];
  if (!fromLanguagePretty || !toLanguagePretty) {
    return;
  }
  return 'Say \'k!' + langStr + ' [word]\' to search for ' + toLanguagePretty + ' definitions of a ' + fromLanguagePretty + ' word.';
}

module.exports = function(msg, fromLanguage, toLanguage, term, queryFunction) {
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
      let result = '';
      if (autoSetToLanguage) {
        result = DictionaryResponseData.CreateSyntaxErrorResponse(getHelp(fromLanguage, fromLanguage, toLanguage));
      } else {
        result = DictionaryResponseData.CreateSyntaxErrorResponse(getHelp(fromLanguage + '-' + toLanguage, fromLanguage, toLanguage));
      }
      return msg.channel.createMessage(result.toDiscordBotString());
    } else {
      return queryFunction(fromLanguage, toLanguage, term).then(result => {
        return msg.channel.createMessage(result.toDiscordBotString());
      }).catch(err => {
        if (err.publicMessage) {
          msg.channel.createMessage(err.publicMessage);
        }

        return 'Error';
      });
    }

    return true;
  }
};
