

const convertToHiragana = require('./util/convert_to_hiragana.js');
const searchForvo = require('./forvo_search.js');
const pronounceDb = require('./pronunciation_db.js');

function convertIndexStringToTrueFalse(wordLength, indexString) {
  if (!indexString) {
    return [];
  }

  const trueIndices = indexString.split('0')
    .filter(str => !!str)
    .map(str => parseInt(str, 10) - 1);

  const trueAndFalse = [];
  for (let i = 0; i < wordLength; i += 1) {
    trueAndFalse.push(trueIndices.indexOf(i) !== -1);
  }

  return trueAndFalse;
}

function getHighLowPitch(wordLength, pitchAccentString) {
  const parts = pitchAccentString.split('').map(int => parseInt(int, 10));

  while (parts.length < wordLength) {
    parts.unshift(0);
  }

  return parts.map(int => (!!int));
}

async function getPronounceInfo(queryWord, logger) {
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
      logger.error({
        event: 'FAILED TO QUERY FORVO',
        err,
      });
    }
  }

  result.found = result.entries.length > 0;
  return result;
}

module.exports = getPronounceInfo;
