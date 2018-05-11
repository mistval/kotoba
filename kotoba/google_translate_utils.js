
const reload = require('require-reload')(require);
const request = require('request-promise');

const API_KEY = reload('./api_keys.js').GOOGLE_TRANSLATE;
const TranslationResult = reload('./translation_result.js');
const { PublicError } = reload('monochrome-bot');

const TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2';
const DETECTION_API = 'https://translation.googleapis.com/language/translate/v2/detect';

const prettyLanguageForLanguageCode = require('./language_code_maps.js').prettyLanguageForGoogleLanguageCode;

const languageCodeAliases = {
  cns: 'zh-CN',
  cnt: 'zh-TW',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  jp: 'ja',
};

function throwNotRespondingError(internalError) {
  const error = new PublicError('Sorry, Google translate is not responding. Please try again later.', 'error', internalError);
  throw error;
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
  let sourceLanguageUnaliased = sourceLanguage;
  let targetLanguageUnaliased = targetLanguage;

  if (languageCodeAliases[sourceLanguage]) {
    sourceLanguageUnaliased = languageCodeAliases[sourceLanguage];
  }
  if (languageCodeAliases[targetLanguage]) {
    targetLanguageUnaliased = languageCodeAliases[targetLanguage];
  }

  try {
    const responseBody = await request({
      uri: TRANSLATE_API,
      qs: {
        target: targetLanguageUnaliased,
        q: text,
        key: API_KEY,
      },
      json: true,
      timeout: 10000,
    });

    const sourceLanguagePretty = prettyLanguageForLanguageCode[sourceLanguageUnaliased];
    const targetLanguagePretty = prettyLanguageForLanguageCode[targetLanguageUnaliased];
    return TranslationResult.CreateSuccessfulResult(
      'Google Translate',
      sourceLanguagePretty,
      targetLanguagePretty,
      `https://translate.google.com/#${sourceLanguage}/${targetLanguage}/${encodeURIComponent(text)}`,
      responseBody.data.translations[0].translatedText,
    );
  } catch (err) {
    return throwNotRespondingError(err);
  }
}

function getPrettyLanguageForLanguageCode(languageCode) {
  let unaliasedLanguageCode = languageCode;
  if (languageCodeAliases[languageCode]) {
    unaliasedLanguageCode = languageCodeAliases[languageCode];
  }

  return prettyLanguageForLanguageCode[unaliasedLanguageCode];
}

function getLanguageCodeForPrettyLanguage(prettyLanguage) {
  if (!prettyLanguage) {
    return undefined;
  }
  const prettyLanguageLowercase = prettyLanguage.toLowerCase();

  return Object.keys(prettyLanguageForLanguageCode)
    .find(key => prettyLanguageForLanguageCode[key].toLowerCase() === prettyLanguageLowercase);
}

module.exports = {
  getLanguageCodeForPrettyLanguage,
  getPrettyLanguageForLanguageCode,
  translate,
  detectLanguage,
};
