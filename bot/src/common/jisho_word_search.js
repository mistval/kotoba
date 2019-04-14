const reload = require('require-reload')(require);
const UnofficialJishoApi = require('unofficial-jisho-api');

const errors = reload('./util/errors.js');

const jishoApi = new UnofficialJishoApi();

const JISHO_SEARCH_BASE_URI = 'http://jisho.org/search/';

function cleanMeaning(str) {
  let cleanStr = str;

  cleanStr = str.replace(/&lt;/g, '<');
  cleanStr = str.replace(/&gt;/g, '>');
  cleanStr = str.replace(/<i>/g, '');
  cleanStr = str.replace(/<\/i>/g, '');
  cleanStr = str.replace(/<b>/g, '');
  cleanStr = str.replace(/<\/b>/g, '');
  cleanStr = str.replace(/<u>/g, '');
  cleanStr = str.replace(/<\/u>/g, '');
  cleanStr = str.replace(/&#39;/g, '\'');
  cleanStr = str.replace(/&quot;/g, '"');

  return cleanStr;
}

function getMeanings(senses) {
  const meanings = [];
  senses.forEach((sense) => {
    const tags = sense.parts_of_speech.concat(sense.tags).concat(sense.info);
    if (sense.english_definitions) {
      const meaning = sense.english_definitions.join(', ');

      let seeAlso = [];
      if (sense.see_also) {
        seeAlso = sense.see_also.map(word => ({
          word,
          uri: `${JISHO_SEARCH_BASE_URI}${encodeURIComponent(word)}`,
        }));
      }

      meanings.push({
        definition: cleanMeaning(meaning),
        tags,
        seeAlso,
      });
    }
  });

  return meanings;
}

function getReadingsForWord(jishoResponseItem) {
  const readingsForWord = {};
  jishoResponseItem.japanese.forEach((japanese) => {
    let word;

    // If the japanese.word property is available, use that.
    // Otherwise, the word and the reading are the same,
    // so use japanese.reading.
    if (typeof japanese.word === typeof '') {
      ({ word } = japanese);
    } else {
      word = japanese.reading;
    }

    if (!readingsForWord[word]) {
      readingsForWord[word] = [];
    }

    const hasReading = !!japanese.reading;
    const readingIsNotWord = japanese.reading !== word;
    const readingIsNotInArray = readingsForWord[word].indexOf(japanese.reading) === -1;

    const shouldAddReading = hasReading && readingIsNotWord && readingIsNotInArray;

    if (shouldAddReading) {
      readingsForWord[word].push(japanese.reading);
    }
  });

  return readingsForWord;
}

function sortWords(words, searchPhrase) {
  // If the word exactly matches the search query,
  // it should come first.
  return words.sort((a, b) => {
    if (a === searchPhrase) {
      return -1;
    }
    if (b === searchPhrase) {
      return 1;
    }
    return 0;
  });
}

function formatJlptTags(jlptTags) {
  return jlptTags
    .map(tag => parseInt(tag.replace('jlpt-n', '')))
    .sort()
    .reverse()
    .map(level => `JLPT N${level}`)
    .slice(0, 1);
}

function formatOtherTag(tag) {
  return tag.replace(/wanikani(.*?)/, (match, g1) => `Wanikani ${g1}`);
}

// The jishoResponseBody is the full response body of the request.
// A jishoResponseItem is one element of the jishoResponseBody.data array.
function parseJishoResponse(jishoResponseBody, searchPhrase) {
  const dictionaryEntries = [];

  jishoResponseBody.data.forEach((jishoResponseItem) => {
    const readingsForWord = getReadingsForWord(jishoResponseItem);
    const allWords = Object.keys(readingsForWord);
    const sortedWords = sortWords(allWords, searchPhrase);

    const sortedWordsAndReadings = sortedWords.map(word => ({
      word,
      readings: readingsForWord[word].filter(reading => !!reading),
    }));

    const jlptTags = formatJlptTags(jishoResponseItem.jlpt);
    const otherTags = jishoResponseItem.tags.map(formatOtherTag);

    if (jishoResponseItem.is_common) {
      otherTags.unshift('Common');
    }

    const resultMeanings = getMeanings(jishoResponseItem.senses);
    dictionaryEntries.push({
      uri: `https://jisho.org/word/${encodeURIComponent(jishoResponseItem.slug)}`,
      wordsAndReadings: sortedWordsAndReadings,
      resultTags: jlptTags.concat(otherTags),
      resultMeanings,
    });
  });

  return {
    searchPhrase,
    dictionaryEntries,
    hasResults: dictionaryEntries.length > 0,
    uri: `${JISHO_SEARCH_BASE_URI}${encodeURIComponent(searchPhrase)}`,
  };
}

function throwNotRespondingError(err) {
  return errors.throwPublicErrorFatal('Jisho', 'Sorry, Jisho is not responding. Please try again later.', 'Error fetching from Jisho', err);
}

async function searchWord(suffix) {
  try {
    const data = await jishoApi.searchForPhrase(suffix);
    if (data.meta.status !== 200) {
      throw new Error(`Bad response status, code: ${data.meta.status.toString()}`);
    }
    return parseJishoResponse(data, suffix);
  } catch (err) {
    return throwNotRespondingError(err);
  }
}

module.exports = searchWord;
