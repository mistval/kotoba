const state = require('./static_state.js');
const convertToHiragana = require('./util/convert_to_hiragana.js');

if (!state.pronounceData) {
  state.pronounceData = require('./resources/dictionaries/pronunciation.json');
}

function convertIndexStringToIndices(indexString) {
  if (!indexString) {
    return [];
  }
  return indexString.split('0')
    .filter(str => !!str)
    .map(str => parseInt(str) - 1);
}

function getHighLowPitch(wordLength, pitchAccentString) {
  let parts = pitchAccentString.split('').map(int => parseInt(int));

  while (parts.length < wordLength) {
    parts.unshift(0);
  }

  let highIndicies = [];
  for (let i = 0; i < parts.length; ++i) {
    if (parts[i] === 1) {
      highIndicies.push(i);
    }
  }

  return highIndicies;
}

module.exports = function(queryWord) {
  let result = {
    query: queryWord,
    found: false,
  };

  let queryAsHiragana = convertToHiragana(queryWord);
  let pronounceDataForQuery = state.pronounceData[queryAsHiragana];

  if (pronounceDataForQuery) {
    result.found = true;
    result.katakana = pronounceDataForQuery.k;
    result.noPronounceIndices = convertIndexStringToIndices(pronounceDataForQuery.npr);
    result.nasalPitchIndices = convertIndexStringToIndices(pronounceDataForQuery.npi);
    result.pitchAccentClass = pronounceDataForQuery.pac;
    result.pitchAccent = getHighLowPitch(result.katakana.length, pronounceDataForQuery.pa);
  }

  return result;
}
