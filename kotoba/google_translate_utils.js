'use strict'
const reload = require('require-reload')(require);
const API_KEY = reload('./api_keys.js').GOOGLE_TRANSLATE;
const TranslationResult = reload('./translation_result.js');
const request = require('request-promise');
const PublicError = reload('monochrome-bot').PublicError;

const TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2';
const DETECTION_API = 'https://translation.googleapis.com/language/translate/v2/detect';

const prettyLanguageForLanguageCode = require('./language_code_maps.js').prettyLanguageForGoogleLanguageCode;
const languageCodeAliases = {
  'cns': 'zh-CN',
  'cnt': 'zh-TW',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  'jp': 'ja',
};

module.exports.detectLanguage = function(text) {
  return request({
    uri: DETECTION_API,
    qs: {
      q: text,
      key: API_KEY,
    },
    json: true,
    timeout: 10000
  }).then(data => {
    return data.data.detections[0][0].language;
  }).catch(throwNotRespondingError);
}

module.exports.translate = function(sourceLanguage, targetLanguage, text) {
  if (languageCodeAliases[sourceLanguage]) {
    sourceLanguage = languageCodeAliases[sourceLanguage];
  }
  if (languageCodeAliases[targetLanguage]) {
    targetLanguage = languageCodeAliases[targetLanguage];
  }
  return request({
    uri: TRANSLATE_API,
    qs: {
      target: targetLanguage,
      q: text,
      key: API_KEY,
    },
    json: true,
    timeout: 10000,
  }).then(data => {
    let sourceLanguagePretty = prettyLanguageForLanguageCode[sourceLanguage];
    let targetLanguagePretty = prettyLanguageForLanguageCode[targetLanguage];
    return TranslationResult.CreateSuccessfulResult(
      'Google Translate',
      sourceLanguagePretty,
      targetLanguagePretty,
      'https://translate.google.com/#' + sourceLanguage + '/' + targetLanguage + '/' + encodeURIComponent(text),
      data.data.translations[0].translatedText);
  }).catch(throwNotRespondingError);
};

module.exports.getPrettyLanguageForLanguageCode = function(languageCode) {
  if (languageCodeAliases[languageCode]) {
    languageCode = languageCodeAliases[languageCode];
  }

  return prettyLanguageForLanguageCode[languageCode];
};

module.exports.getLanguageCodeForPrettyLanguage = function(prettyLanguage) {
  if (!prettyLanguage) {
    return;
  }
  prettyLanguage = prettyLanguage.toLowerCase();
  for (let key of Object.keys(prettyLanguageForLanguageCode)) {
    if (prettyLanguageForLanguageCode[key].toLowerCase() === prettyLanguage) {
      return key;
    }
  }
};

function throwNotRespondingError(internalError) {
  let error = new PublicError('Sorry, Google translate is not responding. Please try again later.', 'error', internalError);
  throw error;
}
