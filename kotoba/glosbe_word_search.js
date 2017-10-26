'use strict'
const reload = require('require-reload')(require);
const request = require('request-promise');
const DictionaryResponseData = reload('./dictionary_response_data.js');
const WordMeaning = reload('./word_meaning.js');
const DictionaryResult = reload('./dictionary_result.js');
const PublicError = reload('./../core/public_error.js');

const prettyLanguageForLanguageCode = require('./language_code_maps.js').prettyLanguageForGlosbeLanguageCode;
const TRANSLATE_API = 'https://glosbe.com/gapi_v0_1/translate';
const RESPONSE_FORMAT = 'json';

const threeLetterLanguageCodeForTwoLetterLanguageCode = {
  en: 'eng',
  de: 'deu',
  ja: 'jpn',
  fr: 'fra',
  es: 'spa',
  ru: 'rus',
  zh: 'zho',
  it: 'ita',
  ar: 'ara',
  pl: 'pol',
  jpn: 'jpn',
  eng: 'eng'
};

function addMeaningsForLanguage(outMeanings, inMeanings, toLanguage) {
  for (let meaning of inMeanings) {
    if (meaning.language === toLanguage) {
      outMeanings.push(new WordMeaning(meaning.text, []));
    }
  }
}

function parseGlosbeResponse(inData) {
  if (inData.result !== 'ok') {
    return DictionaryResponseData.CreateErrorResponse('Received an error code from Glosbe: ' + inData.result);
  } else {
    let inResults = inData.tuc;
    let fromLanguage = inData.from;
    let toLanguage = inData.dest;
    let phrase = inData.phrase;
    let fromLanguagePretty = prettyLanguageForLanguageCode[fromLanguage];
    let toLanguagePretty = prettyLanguageForLanguageCode[toLanguage];

    let outResults = [];

    if (inResults) {
      for (let inResult of inResults) {
        let inPhrase = inResult.phrase;

        if (inPhrase && inPhrase.language === toLanguage) {
          let resultWord = inPhrase.text;

          let inMeanings = inResult.meanings;
          let outMeanings = [];
          if (inMeanings) {
            addMeaningsForLanguage(outMeanings, inMeanings, fromLanguage);
            addMeaningsForLanguage(outMeanings, inMeanings, toLanguage);

            if (fromLanguage !== 'en' && toLanguage !== 'en') {
              addMeaningsForLanguage(outMeanings, inMeanings, 'en');
            }

            outResults.push(new DictionaryResult(resultWord, '', [], outMeanings));
          }
        }
      }
    }

    return DictionaryResponseData.CreateNonErrorResponse(phrase, fromLanguagePretty, toLanguagePretty, true, outResults, '');
  }
}

module.exports = function(fromLanguage, toLanguage, suffix) {
  suffix = suffix.trim();
  let requestFromLanguage = threeLetterLanguageCodeForTwoLetterLanguageCode[fromLanguage];
  let requestToLanguage = threeLetterLanguageCodeForTwoLetterLanguageCode[toLanguage];

  if (requestToLanguage && requestFromLanguage) {
    return request({
      uri: TRANSLATE_API,
      qs: {
        from: requestFromLanguage,
        dest: requestToLanguage,
        format: RESPONSE_FORMAT,
        phrase: suffix
      },
      json: true,
      timeout: 10000
    }).then(data => {
      return parseGlosbeResponse(data);
    }).catch(err => {
      throw new PublicError('glosbe', 'Sorry, Glosbe dictionary is not responding. Please try again later.', err);
    });
  } else {
    return Promise.reject(new Error('unsupported language'));
  }
};
