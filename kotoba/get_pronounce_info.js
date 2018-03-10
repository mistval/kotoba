const state = require('./static_state.js');
const convertToHiragana = require('./util/convert_to_hiragana.js');

if (!state.pronounceData) {
  state.pronounceData = require('./resources/dictionaries/pronunciation.json');
}

function convertIndexStringToTrueFalse(wordLength, indexString) {
  if (!indexString) {
    return [];
  }

  let trueIndices = indexString.split('0')
    .filter(str => !!str)
    .map(str => parseInt(str) - 1);

  let trueAndFalse = [];
  for (let i = 0; i < wordLength; ++i) {
    trueAndFalse.push(trueIndices.indexOf(i) !== -1);
  }

  return trueAndFalse;
}

function getHighLowPitch(wordLength, pitchAccentString) {
  let parts = pitchAccentString.split('').map(int => parseInt(int));

  while (parts.length < wordLength) {
    parts.unshift(0);
  }

  return parts.map(int => int ? true : false);
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

    let katakanaLength = result.katakana.length;

    result.noPronounceIndices = convertIndexStringToTrueFalse(katakanaLength, pronounceDataForQuery.npr);
    result.nasalPitchIndices = convertIndexStringToTrueFalse(katakanaLength, pronounceDataForQuery.npi);
    result.pitchAccentClass = pronounceDataForQuery.pac;
    result.pitchAccent = getHighLowPitch(result.katakana.length, pronounceDataForQuery.pa);
  }

  return result;
}
