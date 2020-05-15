const fs = require('fs');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

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

class ResourceDatabase {
  async load(databasePath, pronunciationDataPath, randomWordDataPath) {
    const needsBuild = !fs.existsSync(databasePath);
    this.database = await sqlite.open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    if (needsBuild) {
      await buildPronunciationTable(this.database, pronunciationDataPath);
      await buildRandomWordsTable(this.database, randomWordDataPath);
    }

    this.searchPronunciationStatement = await this.database.prepare('SELECT resultsJson FROM PronunciationSearchResults WHERE searchTerm = ?');
  }

  async searchPronunciation(searchTerm) {
    const result = await this.searchPronunciationStatement.get(searchTerm);
    return JSON.parse((result || {}).resultsJson || '[]');
  }

  async getRandomWord(level) {
    if (level) {
      const levelResult = await this.database.get('SELECT word FROM RandomWords WHERE level = ? LIMIT (ABS(RANDOM()) % (SELECT COUNT(*) FROM RandomWords WHERE level = ?)),1', level, level);
      if (levelResult) {
        return levelResult.word;
      }
    }

    const result = await this.database.get('SELECT word FROM RandomWords WHERE id = ABS(RANDOM()) %(SELECT COUNT(*) FROM RandomWords)');
    return result.word;
  }
}

module.exports = ResourceDatabase;
