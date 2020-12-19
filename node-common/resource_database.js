const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const assert = require('assert');
const sqlite = require('sqlite');
const convertToHiragana = require('./convert_to_hiragana.js');
const shiritoriWordStartingSequences = require('./shiritori/shiritori_word_starting_sequences.js');

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

async function buildPronunciationTable(database, pronunciationDataPath) {
  const pronunciationData = JSON.parse(fs.readFileSync(pronunciationDataPath));
  const searchTerms = Object.keys(pronunciationData);

  await database.run('CREATE TABLE PronunciationSearchResults (searchTerm CHAR(20) PRIMARY KEY, resultsJson TEXT)');
  const statement = await database.prepare('INSERT INTO PronunciationSearchResults VALUES (?, ?)');

  await database.run('BEGIN');

  for (let i = 0; i < searchTerms.length; i += 1) {
    const searchTerm = searchTerms[i];
    const results = pronunciationData[searchTerm];

    await statement.run(searchTerm, JSON.stringify(results));
  }

  await database.run('COMMIT');
}

async function buildRandomWordsTable(database, randomWordDataPath) {
  const randomWordData = JSON.parse(fs.readFileSync(randomWordDataPath));
  const levels = Object.keys(randomWordData);

  await database.run('CREATE TABLE RandomWords (id INTEGER PRIMARY KEY AUTOINCREMENT, level CHAR(5), word CHAR (10))');
  const statement = await database.prepare('INSERT INTO RandomWords (level, word) VALUES (?, ?)');

  await database.run('BEGIN');

  for (let i = 0; i < levels.length; i += 1) {
    const level = levels[i];
    const words = randomWordData[level];

    for (let j = 0; j < words.length; j += 1) {
      await statement.run(level, words[j]);
    }
  }

  await database.run('COMMIT');
  await database.run('CREATE INDEX level ON RandomWords (level)');
}

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
    path.join(__dirname, 'shiritori', 'readings_for_start_sequence.json'),
    JSON.stringify(readingsForStartSequence),
  );
}

async function decompressJson(filePath) {
  const compressedBytes = await fs.promises.readFile(filePath);

  const decompressedBytes = await new Promise((fulfill, reject) => {
    zlib.gunzip(compressedBytes, (err, decompressed) => {
      if (err) {
        return reject(err);
      }

      return fulfill(decompressed);
    });
  });

  const decompressedString = decompressedBytes.toString('utf8');
  return JSON.parse(decompressedString);
}

function unique(arr) {
  return arr.filter((e, i) => arr.indexOf(e) === i);
}

async function buildShiritoriTable(database, wordFrequencyDataPath, jmdictPath) {
  const jmdictEntries = await decompressJson(jmdictPath);
  const wordsByFrequency = JSON.parse(await fs.promises.readFile(wordFrequencyDataPath));
  const highestDifficultyForReading = {};

  await database.run('CREATE TABLE ShiritoriWords (id INTEGER PRIMARY KEY AUTOINCREMENT, word CHAR(20), reading CHAR(20), data TEXT)');
  const insertWordStatement = await database.prepare('INSERT INTO ShiritoriWords (word, reading, data) VALUES (?, ?, ?)');

  await database.run('BEGIN');

  for (let entryIndex = 0; entryIndex < jmdictEntries.length; entryIndex += 1) {
    const entry = jmdictEntries[entryIndex];
    const entryNum = entry.ent_seq[0];
    const words = (entry.k_ele || []).flatMap(element => element.keb);
    const readingElements = entry.r_ele;
    const partsOfSpeech = entry.sense.flatMap(sense => sense.pos);
    const isNoun = jmdictNounCodes.some(c => partsOfSpeech.includes(c));
    const definitions = entry.sense[0].gloss.map(gloss => gloss.$t);

    assert(readingElements.length > 0, `No readings for ${entryNum}`);
    assert(partsOfSpeech.length > 0, `No POS for ${entryNum}`);
    assert(definitions.length > 0, `No definitions for ${entryNum}`);

    if (words.length === 0) {
      for (const reading of readingElements.flatMap(r => r.reb)) {
        const hiraganaReading = convertToHiragana(reading);
        const difficultyScore = wordsByFrequency.indexOf(reading);

        highestDifficultyForReading[reading] = highestDifficultyForReading[reading]
            ? Math.max(highestDifficultyForReading[reading], difficultyScore)
            : difficultyScore;

        const searchResult = {
          word: reading,
          reading: hiraganaReading,
          definitions,
          isNoun,
          difficultyScore,
        };

        const json = JSON.stringify(searchResult);
        await insertWordStatement.run(reading, hiraganaReading, json);
      }
    } else {
      for (const word of words) {
        const difficultyScore = wordsByFrequency.indexOf(word);

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
          };

          const json = JSON.stringify(searchResult);
          await insertWordStatement.run(word, reading, json);
        }
      }
    }
  }

  buildReadingsForStartSequence(highestDifficultyForReading);

  await database.run('COMMIT');
  await database.run('CREATE INDEX shiritori_word ON ShiritoriWords (word)');
  await database.run('CREATE INDEX shiritori_reading ON ShiritoriWords (reading)');
}

class ResourceDatabase {
  async load(databasePath, pronunciationDataPath, randomWordDataPath, wordFrequencyDataPath, jmdictPath) {
    const needsBuild = !fs.existsSync(databasePath);
    if (needsBuild && (
      !pronunciationDataPath
      || !randomWordDataPath
      || !wordFrequencyDataPath
      || !jmdictPath
    )) {
      throw new Error('Cannot build resource database. Required resource paths not provided.');
    }

    await fs.promises.mkdir(path.dirname(databasePath), { recursive: true });

    const sqlite3 = require('sqlite3');
    this.database = await sqlite.open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    if (needsBuild) {
      await buildPronunciationTable(this.database, pronunciationDataPath);
      await buildRandomWordsTable(this.database, randomWordDataPath);
      await buildShiritoriTable(this.database, wordFrequencyDataPath, jmdictPath);
    }

    this.searchPronunciationStatement = await this.database.prepare('SELECT resultsJson FROM PronunciationSearchResults WHERE searchTerm = ?');
    this.searchShiritoriStatement = await this.database.prepare('SELECT data FROM ShiritoriWords WHERE word = ? OR reading = ?');
  }

  async getShiritoriWords(searchTermAsHiragana) {
    const results = await this.searchShiritoriStatement.all(
      searchTermAsHiragana,
      searchTermAsHiragana,
    );

    return results.map(r => JSON.parse(r.data));
  }

  async searchPronunciation(searchTerm) {
    const result = await this.searchPronunciationStatement.get(searchTerm);
    return JSON.parse((result || {}).resultsJson || '[]');
  }

  async getRandomWord(level) {
    if (level) {
      const count = await this.database.get('SELECT COUNT(*) as count FROM RandomWords WHERE level = ?', level);
      if (count.count > 0) {
        const levelResult = await this.database.get('SELECT word FROM RandomWords WHERE level = ? LIMIT (ABS(RANDOM()) % ?),1', level, count.count);
        if (levelResult) {
          return levelResult.word;
        }
      }
    }

    const result = await this.database.get('SELECT word FROM RandomWords WHERE id = ABS(RANDOM()) %(SELECT COUNT(*) FROM RandomWords)');
    return result.word;
  }
}

module.exports = ResourceDatabase;
