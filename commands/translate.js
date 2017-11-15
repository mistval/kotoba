'use strict'

const reload = require('require-reload')(require);
const glosbeApi = reload('./../kotoba/glosbe_word_search.js');
const dictionaryQuery = reload('./../kotoba/dictionary_query.js');
const translateQuery = reload('./../kotoba/translate_query.js');
const googleTranslate = reload('./../kotoba/google_translate_utils.js');
const prettyLanguageForLanguageCode = reload('./../kotoba/language_code_maps.js').prettyLanguageForGoogleLanguageCode;

function createUnknownLanguageCodeString(languageCode) {
  return 'I don\'t recognize the language code **' + languageCode + '**. Say \'k!help translate\' for a list of supported languages.';
}

function createLongDescription() {
  let supportedLanguageString = Object.keys(prettyLanguageForLanguageCode).map(key => {
    return prettyLanguageForLanguageCode[key] + ' (' + key + ')';
  }).join(', ');

  return `Use Google Translate to translate text. If you want to translate from any language into English, or from English into Japanese, you can just use k!translate and I will usually detect the languages and do what you want.

If you want to translate into a language other than English, you can do that too. The syntax is k!translate-[language code]. For example, k!translate-de to translate into German.

If you need to specify both the original and the target language, you can do that too by saying k!translate-[from language code]>[to language code]. For example, k!translate-de>ru to translate German into Russian.

I support the following languages:

${supportedLanguageString}
`;
}

module.exports = {
  commandAliases: ['k!translate', 'k!trans', 'k!gt', 'k!t'],
  aliasesForHelp: ['k!translate', 'k!t'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'translate49394',
  shortDescription: 'Use Google Translate to translate text.',
  longDescription: createLongDescription(),
  usageExample: 'k!translate 吾輩は猫である',
  action(bot, msg, suffix, settings, extension) {
    if (!suffix && (!extension || extension === '-')) {
      return msg.channel.createMessage('Say \'k!translate [text]\' to translate text. Say \'k!help translate\' for help.');
    }
    let fromLanguageCode;
    let toLanguageCode;
    if (extension) {
      let languagePart = extension.replace('-', '');
      let languages = languagePart.split('/');
      if (languagePart.indexOf('>') !== -1) {
        languages = languagePart.split('>');
      }
      fromLanguageCode = languages[0];
      toLanguageCode = languages[1];
    }
    fromLanguageCode = googleTranslate.getLanguageCodeForPrettyLanguage(fromLanguageCode) || fromLanguageCode;
    toLanguageCode = googleTranslate.getLanguageCodeForPrettyLanguage(toLanguageCode) || toLanguageCode;
    let fromLanguagePretty = googleTranslate.getPrettyLanguageForLanguageCode(fromLanguageCode);
    let toLanguagePretty = googleTranslate.getPrettyLanguageForLanguageCode(toLanguageCode);
    if (!toLanguagePretty && toLanguageCode) {
      return msg.channel.createMessage(createUnknownLanguageCodeString(toLanguageCode));
    } else if (!fromLanguagePretty && fromLanguageCode) {
      return msg.channel.createMessage(createUnknownLanguageCodeString(fromLanguageCode));
    }

    if (!suffix) {
      if (fromLanguagePretty && toLanguagePretty) {
        return msg.channel.createMessage(
          'Say \'k!translate-' + fromLanguageCode + '>' + toLanguageCode + ' [text]\' to translate text from ' + fromLanguagePretty + ' to ' + toLanguagePretty + '.');
      } else if (fromLanguagePretty) {
        return msg.channel.createMessage('Say \'k!translate-' + fromLanguageCode + ' [text]\' to translate text to or from ' + fromLanguagePretty + '.');
      }
    }

    if (toLanguageCode) {
      return translateQuery(suffix, fromLanguageCode, toLanguageCode, googleTranslate.translate, bot, msg);
    } else {
      return googleTranslate.detectLanguage(suffix).then(languageCode => {
        if (languageCode === 'und' || !googleTranslate.getPrettyLanguageForLanguageCode(languageCode)) {
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

        return translateQuery(suffix, fromLanguageCode, toLanguageCode, googleTranslate.translate, bot, msg);
      });
    }
  },
  canHandleExtension(extension) {
    return extension.startsWith('-');
  },
};
