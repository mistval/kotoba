const reload = require('require-reload')(require);
const glosbeApi = reload('./../kotoba/glosbe_word_search.js');
const dictionaryQuery = reload('./../kotoba/dictionary_query.js');
const translateQuery = reload('./../kotoba/translate_query.js');
const googleTranslate = reload('./../kotoba/google_translate_utils.js');

const PREFIX = 'k!gt';

function createUnknownLanguageCodeString(languageCode) {
  return 'I don\'t recognize the language code **' + languageCode + '**. Say \'k!help gt\' for a list of supported languages.';
}

module.exports = {
  name: 'Google Translate',
  action: (bot, msg) => {
    if (!msg.content.startsWith(PREFIX)) {
      return false;
    }
    if (msg.content.trim() === PREFIX) {
      msg.channel.createMessage('Say \'k!gt [text]\' to translate text. Say \'k!help gt\' for advanced help.');
      return true;
    }
    let tokens = msg.content.split(' ');
    let commandPart = tokens.shift();
    if (commandPart !== 'k!gt' && !commandPart.startsWith('k!gt-')) {
      return false;
    }
    let fromLanguageCode;
    let toLanguageCode;
    if (commandPart.startsWith('k!gt-')) {
      let languagePart = commandPart.replace('k!gt-', '');
      let languages = languagePart.split('/');
      fromLanguageCode = languages[0];
      toLanguageCode = languages[1];
    }
    let fromLanguagePretty = googleTranslate.getPrettyLanguageForLanguageCode(fromLanguageCode);
    let toLanguagePretty = googleTranslate.getPrettyLanguageForLanguageCode(toLanguageCode);
    let text = tokens.join(' ');
    if (text.length === 0) {
      if (fromLanguagePretty && toLanguagePretty) {
        msg.channel.createMessage(
          'Say \'k!gt-' + fromLanguageCode + '/' + toLanguageCode + ' [text]\' to translate text from ' + fromLanguagePretty + ' to ' + toLanguagePretty + '.');
      } else if (!toLanguagePretty && toLanguageCode) {
        msg.channel.createMessage(createUnknownLanguageCodeString(toLanguageCode));
      } else if (!fromLanguagePretty && fromLanguageCode) {
        msg.channel.createMessage(createUnknownLanguageCodeString(fromLanguageCode));
      } else if (fromLanguagePretty) {
        msg.channel.createMessage('Say \'k!gt-' + fromLanguageCode + ' [text]\' to translate text to or from ' + fromLanguagePretty + '.');
      }
      return true;
    }

    if (toLanguageCode) {
      return translateQuery(text, fromLanguageCode, toLanguageCode, googleTranslate.translate, bot, msg);
    } else {
      return googleTranslate.detectLanguage(text).then(languageCode => {
        if (languageCode === 'und') {
          languageCode = 'en';
        }
        if (languageCode === 'zh-CN' || languageCode === 'zh-TW') {
          languageCode = 'ja';
        }
        if (fromLanguageCode !== languageCode) {
          toLanguageCode = fromLanguageCode;
          fromLanguageCode = languageCode;
        }
        if (!toLanguageCode) {
          if (fromLanguageCode === 'en') {
            toLanguageCode = 'ja';
          } else {
            toLanguageCode = 'en';
          }
        }

        return translateQuery(text, fromLanguageCode, toLanguageCode, googleTranslate.translate, bot, msg);
      });
    }
  }
};
