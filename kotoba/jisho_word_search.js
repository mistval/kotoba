'use strict'
const reload = require('require-reload')(require);
const request = require('request-promise');
const DictionaryResponseData = reload('./dictionary_response_data.js');
const WordMeaning = reload('./word_meaning.js');
const DictionaryResult = reload('./dictionary_result.js');
const PublicError = reload('monochrome-bot').PublicError;

const JISHO_API = 'http://jisho.org/api/v1/search/words';

const WANIKANI_TAG_PREFIX = 'wanikani';
const PARTS_OF_SPEECH_KEY = 'parts_of_speech';
const ENGLISH_DEFINITIONS_KEY = 'english_definitions';
const FROM_LANGUAGE_CODE = 'en';
const TO_LANGUAGE_CODE = 'ja';

function removeWanikaniTags(tags) {
  return tags.filter(tag => {
    return !(typeof tag === typeof '' && tag.startsWith(WANIKANI_TAG_PREFIX));
  });
}

function getMeanings(senses) {
  let meanings = [];
  for (let sense of senses) {
    /* The style rules don't like underscores in identifiers, nor bracket notation with strings. So... do it like this. */
    let tags = sense[PARTS_OF_SPEECH_KEY].concat(sense.tags).concat(sense.info);
    removeWanikaniTags(tags);
    if (sense[ENGLISH_DEFINITIONS_KEY]) {
      let meaning = sense[ENGLISH_DEFINITIONS_KEY].join(', ');
      meanings.push(new WordMeaning(meaning, tags));
    }
  }

  return meanings;
}

function getJapanesePartFromDataElement(dataElement, phrase) {
  let partThatMatches = dataElement.japanese.find(japanese => japanese.word === phrase);
  return partThatMatches || dataElement.japanese[0];
}

function parseJishoResponse(inData, phrase) {
  inData = inData.data;
  let dictionaryResults = [];

  for (let dataElement of inData) {
    let readingsForWord = {};
    for (let japanese of dataElement.japanese) {
      let word;
      if (typeof japanese.word === typeof '') {
        word = japanese.word;
      }  else {
        word = japanese.reading;
      }

      if (!readingsForWord[word]) {
        readingsForWord[word] = [];
      }
      if (japanese.reading !== word && readingsForWord[word].indexOf(japanese.reading) === -1) {
        readingsForWord[word].push(japanese.reading);
      }
    }

    let words = Object.keys(readingsForWord).sort((a, b) => {
      if (a === phrase) {
        return -1;
      }
      if (b === phrase) {
        return 1;
      }
      return 0;
    });

    let wordsAndReadings = words.map(word => {
      return {word: word, readings: readingsForWord[word].filter(reading => !!reading)};
    });

    let tags = removeWanikaniTags(dataElement.tags);
    let wordMeanings = getMeanings(dataElement.senses);
    dictionaryResults.push(new DictionaryResult(wordsAndReadings, tags, wordMeanings));
  }

  let extraText = '';
  if (dictionaryResults.length > 0) {
    extraText = 'I got these definitions from Jisho. See more: <http://jisho.org/search/' + encodeURIComponent(phrase) + '>\nTry k!w to search Weblio, k!k to search for Kanji, or k!help to see more commands.';
  }

  if (dictionaryResults.length === 0) {
    throw PublicError.createWithCustomPublicMessage('Didn\'t find any results for **' + phrase + '**', false, 'No results');
  }
  return new DictionaryResponseData(phrase, FROM_LANGUAGE_CODE, TO_LANGUAGE_CODE, false, dictionaryResults, extraText, 'http://jisho.org/search/' + encodeURIComponent(phrase));
}

function throwNotRespondingError(err) {
  throw new PublicError('Sorry, Jisho is not responding. Please try again later.', false, 'Error fetching from Jisho', err);
}

module.exports = function(fromLanguage, toLanguage, suffix) {
  return request({
    uri: JISHO_API,
    qs: {
      keyword: suffix
    },
    json: true,
    timeout: 10000,
  }).catch(err => {
    throwNotRespondingError(err);
  }).then(data => {
    if (data.meta.status !== 200) {
      throwNotRespondingError(new Error('Bad response status, code: ' + data.meta.status.toString()));
    }
    return parseJishoResponse(data, suffix);
  });
};
