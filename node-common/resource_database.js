const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite');
const convertToHiragana = require('./convert_to_hiragana.js');
const shiritoriWordStartingSequences = require('./shiritori/shiritori_word_starting_sequences.js');

const edictPartOfSpeechRegex = /\((.*?)\)/;
const edictNounCodes = [
  'n',
  'n-pref',
  'n-suf',
  'n-t',
  'pn',
  'num',
  'n-adv',
  'n-t',
  'vs',
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

function getEdictLines(edictPath) {
  const edictLines = fs.readFileSync(edictPath, 'utf8').split('\n');
  edictLines.shift(); // First line is a header.
  return edictLines;
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

async function buildShiritoriTable(database, wordFrequencyDataPath, edictPath) {
  const wordsByFrequency = JSON.parse(await fs.promises.readFile(wordFrequencyDataPath));
  const highestDifficultyForReading = {};

  await database.run('CREATE TABLE ShiritoriWords (id INTEGER PRIMARY KEY AUTOINCREMENT, word CHAR(20), reading CHAR(20), data TEXT)');
  const insertWordStatement = await database.prepare('INSERT INTO ShiritoriWords (word, reading, data) VALUES (?, ?, ?)');

  const edictLines = getEdictLines(edictPath);

  await database.run('BEGIN');

  for (let i = 0; i < edictLines.length; i += 1) {
    const line = edictLines[i];

    if (line) {
      const tokens = line.split(' ');
      const word = tokens.shift();
      const wordAsHiragana = convertToHiragana(word);
      const readingPart = tokens[0];

      let reading;
      if (readingPart.startsWith('[')) {
        reading = convertToHiragana(readingPart.replace('[', '').replace(']', ''));
        tokens.shift();
      } else {
        reading = wordAsHiragana;
      }

      const definitionParts = tokens.join(' ').split('/');
      definitionParts.pop(); // The last one is always empty
      definitionParts.shift(); // The first one is always empty

      const definitions = [];
      let isNoun = false;
      definitionParts.forEach((definitionPart) => {
        let definition = definitionPart;
        let partOfSpeechMatch = definition.match(edictPartOfSpeechRegex);
        while (partOfSpeechMatch) {
          definition = definition.replace(partOfSpeechMatch[0], '');
          const partsOfSpeech = partOfSpeechMatch[1].split(',');
          if (!isNoun) {
            isNoun = partsOfSpeech.some(
              partOfSpeechSymbol => edictNounCodes.indexOf(partOfSpeechSymbol) !== -1,
            );
          }
          partOfSpeechMatch = definition.match(edictPartOfSpeechRegex);
        }

        definition = definition.trim();
        if (definition) {
          definitions.push(definition);
        }
      });

      const difficultyScore = wordsByFrequency.indexOf(word);
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

  buildReadingsForStartSequence(highestDifficultyForReading);

  await database.run('COMMIT');
  await database.run('CREATE INDEX shiritori_word ON ShiritoriWords (word)');
  await database.run('CREATE INDEX shiritori_reading ON ShiritoriWords (reading)');
}

class ResourceDatabase {
  async load(databasePath, pronunciationDataPath, randomWordDataPath, wordFrequencyDataPath, edictPath) {
    const needsBuild = !fs.existsSync(databasePath);
    if (needsBuild && (
      !pronunciationDataPath
      || !randomWordDataPath
      || !wordFrequencyDataPath
      || !edictPath
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
      await buildShiritoriTable(this.database, wordFrequencyDataPath, edictPath);
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
