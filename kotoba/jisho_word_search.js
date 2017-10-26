'use strict'
const reload = require('require-reload')(require);
const request = require('request-promise');
const DictionaryResponseData = reload('./dictionary_response_data.js');
const WordMeaning = reload('./word_meaning.js');
const DictionaryResult = reload('./dictionary_result.js');
const PublicError = reload('./../core/public_error.js');

const TranslateApi = 'http://jisho.org/api/v1/search/words';

function removeWanikaniTags(tags) {
  return tags.filter(tag => {
    return !(typeof tag === 'string' && tag.startsWith('wanikani'));
  });
}

function getMeanings(sensesJsonArray) {
  let meanings = [];
  for (let sense of sensesJsonArray) {
    /* The style rules don't like underscores in identifiers, nor bracket notation with strings. So... do it like this. */
    const partsOfSpeechKey = 'parts_of_speech';
    let tags = sense[partsOfSpeechKey].concat(sense.tags).concat(sense.info);
    removeWanikaniTags(tags);
    const englishDefitionsKey = 'english_definitions';
    if (sense[englishDefitionsKey]) {
      let meaning = sense[englishDefitionsKey].join(', ');
      meanings.push(new WordMeaning(meaning, tags));
    }
  }

  return meanings;
}

function parseJishoResponse(inData, phrase) {
  if (inData.meta.status !== 200) {
    return DictionaryResponseData.CreateErrorResponse('Received an error code from Jisho: ' + inData.meta);
  } else {
    inData = inData.data;
    let dictionaryResults = [];

    for (let dataElement of inData) {
      let result = '';
      let reading = '';
      if (typeof dataElement.japanese[0].word === 'string') {
        result = dataElement.japanese[0].word;
        if (typeof dataElement.japanese[0].reading === 'string') {
          reading = dataElement.japanese[0].reading;
        }
      } else {
        result = dataElement.japanese[0].reading;
      }

      let tags = removeWanikaniTags(dataElement.tags);
      let wordMeanings = getMeanings(dataElement.senses);
      dictionaryResults.push(new DictionaryResult(result, reading, tags, wordMeanings));
    }

    let extraText = dictionaryResults.length > 0 ? 'I got these definitions from Jisho. See more: <http://jisho.org/search/' + encodeURIComponent(phrase) + '>\nTry k!w to search Weblio, k!k to search for Kanji, or k!help to see more commands.' : '';
    return DictionaryResponseData.CreateNonErrorResponse(phrase, 'en', 'ja', false, dictionaryResults, extraText);
  }
}

module.exports = function(fromLanguage, toLanguage, suffix) {
  return request({
    uri: TranslateApi,
    qs: {
      keyword: suffix
    },
    json: true,
    timeout: 10000
  })
  .then(data => {
    return parseJishoResponse(data, suffix);
  }).catch(err => {
    throw new PublicError('jisho', 'Sorry, Jisho is not responding. Please try again later.', err);
  });
};
