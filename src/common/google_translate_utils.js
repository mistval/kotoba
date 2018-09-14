const reload = require('require-reload')(require);
const request = require('request-promise');
const assert = require('assert');
const htmlEntitiesModule = require('html-entities');

const htmlEntities = new htmlEntitiesModule.XmlEntities();

const { throwPublicErrorFatal } = reload('./util/errors.js');
const { languageNameForGoogleLanguageCode } = reload('./language_code_maps.js');

const API_KEY = reload('./../../api_keys.js').GOOGLE_TRANSLATE;

const TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2';
const DETECTION_API = 'https://translation.googleapis.com/language/translate/v2/detect';

const languageCodeAliases = {
  cns: 'zh-CN',
  cnt: 'zh-TW',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  jp: 'ja',
};

const googleLanguageCodeForLanguageNameLowercase = {};
Object.keys(languageNameForGoogleLanguageCode).forEach((googleLanguageCode) => {
  const languageName = languageNameForGoogleLanguageCode[googleLanguageCode];
  const languageNameLowercase = languageName.toLowerCase();
  googleLanguageCodeForLanguageNameLowercase[languageNameLowercase] = googleLanguageCode;
});

function throwNotRespondingError(internalError) {
  return throwPublicErrorFatal('Google Translate', 'Sorry, Google translate is not responding. Please try again later.', 'Error', internalError);
}

// Tries to resolve input to a language code.
// Input can be a language code (case insensitive)
// or it can be a language name (case insensitive)
function toLanguageCode(input) {
  const inputLowercase = input.toLowerCase();
  if (languageCodeAliases[inputLowercase]) {
    return languageCodeAliases[inputLowercase];
  }

  if (languageNameForGoogleLanguageCode[inputLowercase]) {
    return inputLowercase;
  }

  if (googleLanguageCodeForLanguageNameLowercase[inputLowercase]) {
    return googleLanguageCodeForLanguageNameLowercase[inputLowercase];
  }

  return undefined;
}

// Tries to resolve input to a language name.
// Input can be a language code (case insensitive)
// or it can be a language name (case insensitive)
function toLanguageName(input) {
  const languageCode = toLanguageCode(input);
  return languageNameForGoogleLanguageCode[languageCode];
}

function languageIsChinese(input) {
  const languageCode = toLanguageCode(input);
  return languageCode === 'zh-CN' || languageCode === 'zh-TW';
}

async function detectLanguage(text) {
  try {
    const detectionResult = await request({
      uri: DETECTION_API,
      qs: {
        q: text,
        key: API_KEY,
      },
      json: true,
      timeout: 10000,
    });

    return detectionResult.data.detections[0][0].language;
  } catch (err) {
    return throwNotRespondingError(err);
  }
}

async function translate(sourceLanguage, targetLanguage, text) {
  const sourceLanguageCode = toLanguageCode(sourceLanguage);
  const targetLanguageCode = toLanguageCode(targetLanguage);
  assert(sourceLanguageCode && targetLanguageCode, 'Invalid sourceLanguage or targetLanguage');

  try {
    const responseBody = await request({
      uri: TRANSLATE_API,
      qs: {
        source: sourceLanguageCode,
        target: targetLanguageCode,
        q: text,
        key: API_KEY,
      },
      json: true,
      timeout: 10000,
    });

    const resultText = htmlEntities.decode(responseBody.data.translations[0].translatedText);
    const uri = `https://translate.google.com/#${sourceLanguageCode}/${targetLanguageCode}/${encodeURIComponent(text)}`;

    return {
      uri,
      text: resultText,
    };
  } catch (err) {
    return throwNotRespondingError(err);
  }
}

module.exports = {
  toLanguageCode,
  toLanguageName,
  detectLanguage,
  translate,
  languageIsChinese,
  languageNameForLanguageCode: languageNameForGoogleLanguageCode,
};
