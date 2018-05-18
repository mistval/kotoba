const reload = require('require-reload')(require);
const state = require('./static_state.js');
const convertToHiragana = reload('./util/convert_to_hiragana.js');
const searchForvo = reload('./forvo_search.js');

if (!state.pronounceData) {
  state.pronounceData = require('./../../resources/dictionaries/pronunciation.json');
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

module.exports = async function(queryWord) {
  let result = {
    query: queryWord,
    found: false,
  };

  let queryAsHiragana = convertToHiragana(queryWord);
  let pronounceDataForQuery = state.pronounceData[queryAsHiragana];

  if (pronounceDataForQuery) {
    result.found = true;
    result.entries = pronounceDataForQuery.map(entry => {
      let katakanaLength = entry.kat.length;
      return {
        katakana: entry.kat,
        kanji: entry.kan,
        noPronounceIndices: convertIndexStringToTrueFalse(katakanaLength, entry.npr),
        nasalPitchIndices: convertIndexStringToTrueFalse(katakanaLength, entry.npi),
        pitchAccent: getHighLowPitch(katakanaLength, entry.pa),
        pitchAccentClass: entry.pac,
        getAudioClips: () => searchForvo(entry.kan[0]),
      };
    });
  }

  return result;
};
