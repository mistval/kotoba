const fs = require('fs');
const assert = require('assert');
const path = require('path');
const zlib = require('zlib');
const shiritoriWordStartingSequences = require('../shiritori/shiritori_word_starting_sequences.js');
const convertToHiragana = require('../convert_to_hiragana.js');

const jmdictNounCodes = [
  'n',
  'n-pref',
  'n-suf',
  'n-t',
  'pn',
  'num',
  'n-adv',
  'n-t',
  'vs',
  'adj-na',
];

function buildReadingsForStartSequence(highestDifficultyForReading) {
  const readingsForStartSequence = {};
  const readings = Object.keys(highestDifficultyForReading);

  readings.forEach((reading) => {
    // Skip any readings with only words of unknown difficulty
    const highestDifficulty = highestDifficultyForReading[reading];
    if (highestDifficulty === -1) {
      return;
    }

    const startSequences = shiritoriWordStartingSequences.filter(
      startSequence => reading.startsWith(startSequence),
    );

    startSequences.forEach((startSequence) => {
      if (!readingsForStartSequence[startSequence]) {
        readingsForStartSequence[startSequence] = [];
      }

      readingsForStartSequence[startSequence].push({ reading, highestDifficulty });
    });
  });

  // Sort the readings for each start sequence in ascending order based on
  // the highest difficulty word known for that reading.
  shiritoriWordStartingSequences.forEach((startSequence) => {
    const readingInfos = readingsForStartSequence[startSequence];
    if (!readingInfos) {
      return;
    }
    readingInfos.sort((a, b) => a.highestDifficulty - b.highestDifficulty);
    readingsForStartSequence[startSequence] = readingInfos.map(info => info.reading);
  });

  fs.writeFileSync(
    path.join(__dirname, '..', 'shiritori', 'readings_for_start_sequence.json'),
    JSON.stringify(readingsForStartSequence),
  );
}

function decompressJson(filePath) {
  const compressedBytes = fs.readFileSync(filePath);

  const decompressedBytes = zlib.gunzipSync(compressedBytes);

  const decompressedString = decompressedBytes.toString('utf8');
  return JSON.parse(decompressedString);
}

function unique(arr) {
  return arr.filter((e, i) => arr.indexOf(e) === i);
}

module.exports = function buildShiritoriTable(database, wordFrequencyDataPath, jmdictPath) {
  const jmdictEntries = decompressJson(jmdictPath);
  const wordsByFrequency = JSON.parse(fs.readFileSync(wordFrequencyDataPath));
  const highestDifficultyForReading = {};

  database.exec('CREATE TABLE ShiritoriWords (id INTEGER PRIMARY KEY AUTOINCREMENT, word CHAR(20), reading CHAR(20), data TEXT);');
  const insertWordStatement = database.prepare('INSERT INTO ShiritoriWords (word, reading, data) VALUES (?, ?, ?);');

  const insertTransaction = database.transaction(() => {
    for (let entryIndex = 0; entryIndex < jmdictEntries.length; entryIndex += 1) {
      const entry = jmdictEntries[entryIndex];
      const entryNum = entry.ent_seq[0];
      const words = (entry.k_ele || []).flatMap(element => element.keb);
      const readingElements = entry.r_ele;
      const partsOfSpeech = entry.sense.flatMap(sense => sense.pos);
      const misc = entry.sense.flatMap(s => s.misc);
      const isNoun = jmdictNounCodes.some(c => partsOfSpeech.includes(c));
      const botBanned = misc.includes('vulg');
      const definitions = entry.sense[0].gloss.map(gloss => gloss.$t);

      assert(readingElements.length > 0, `No readings for ${entryNum}`);
      assert(partsOfSpeech.length > 0, `No POS for ${entryNum}`);
      assert(definitions.length > 0, `No definitions for ${entryNum}`);

      if (words.length === 0) {
        for (const reading of readingElements.flatMap(r => r.reb)) {
          const hiraganaReading = convertToHiragana(reading);
          let difficultyScore = wordsByFrequency.indexOf(reading);
          if (difficultyScore === -1) {
            difficultyScore = Number.MAX_SAFE_INTEGER;
          }

          highestDifficultyForReading[reading] = highestDifficultyForReading[reading]
              ? Math.max(highestDifficultyForReading[reading], difficultyScore)
              : difficultyScore;

          const searchResult = {
            word: reading,
            reading: hiraganaReading,
            definitions,
            isNoun,
            difficultyScore,
            botBanned,
          };

          const json = JSON.stringify(searchResult);
          insertWordStatement.run(reading, hiraganaReading, json);
        }
      } else {
        for (const word of words) {
          let difficultyScore = wordsByFrequency.indexOf(word);
          if (difficultyScore === -1) {
            difficultyScore = Number.MAX_SAFE_INTEGER;
          }

          const relevantReadings = readingElements
            .filter(r => !r.re_restr || r.re_restr.includes(word))
            .flatMap(r => r.reb)
            .map(convertToHiragana);

          const uniqueReadings = unique(relevantReadings);

          for (const reading of uniqueReadings) {
            highestDifficultyForReading[reading] = highestDifficultyForReading[reading]
              ? Math.max(highestDifficultyForReading[reading], difficultyScore)
              : difficultyScore;

            const searchResult = {
              word,
              reading,
              definitions,
              isNoun,
              difficultyScore,
              botBanned,
            };

            const json = JSON.stringify(searchResult);
            insertWordStatement.run(word, reading, json);
          }
        }
      }
    }
  });

  insertTransaction();

  buildReadingsForStartSequence(highestDifficultyForReading);

  database.exec('CREATE INDEX shiritori_word ON ShiritoriWords (word);');
  database.exec('CREATE INDEX shiritori_reading ON ShiritoriWords (reading);');
}
