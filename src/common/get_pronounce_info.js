const reload = require('require-reload')(require);

const convertToHiragana = reload('./util/convert_to_hiragana.js');
const searchForvo = reload('./forvo_search.js');
const pronounceDb = reload('./pronunciation_db.js');

function convertIndexStringToTrueFalse(wordLength, indexString) {
  if (!indexString) {
    return [];
  }

  const trueIndices = indexString.split('0')
    .filter(str => !!str)
    .map(str => parseInt(str) - 1);

  const trueAndFalse = [];
  for (let i = 0; i < wordLength; ++i) {
    trueAndFalse.push(trueIndices.indexOf(i) !== -1);
  }

  return trueAndFalse;
}

function getHighLowPitch(wordLength, pitchAccentString) {
  const parts = pitchAccentString.split('').map(int => parseInt(int));

  while (parts.length < wordLength) {
    parts.unshift(0);
  }

  return parts.map(int => (!!int));
}

module.exports = async function (queryWord, logger) {
  const result = {
    query: queryWord,
    entries: [],
  };

  const queryAsHiragana = convertToHiragana(queryWord);
  const pronounceDataForQuery = await pronounceDb.search(queryAsHiragana);

  if (pronounceDataForQuery) {
    result.entries = pronounceDataForQuery.map((entry) => {
      const katakanaLength = entry.katakana.length;
      return {
        hasPitchData: true,
        katakana: entry.katakana,
        kanji: entry.kanji,
        noPronounceIndices: convertIndexStringToTrueFalse(katakanaLength, entry.noPronounceIndices),
        nasalPitchIndices: convertIndexStringToTrueFalse(katakanaLength, entry.nasalPitchIndices),
        pitchAccent: getHighLowPitch(katakanaLength, entry.pitchAccent),
        pitchAccentClass: entry.pitchAccentClass,
        getAudioClips: () => searchForvo(entry.kanji[0]),
      };
    });
  } else {
    try {
      const forvoData = await searchForvo(queryWord);
      if (forvoData.found) {
        result.entries = [{ forvoData, hasPitchData: false }];
      }
    } catch (err) {
      logger.logFailure('PRONOUNCE', 'Failed to get forvo data', err);
    }
  }

  result.found = result.entries.length > 0;
  return result;
};
