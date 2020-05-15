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

class ResourceDatabase {
  async load(databasePath, pronunciationDataPath) {
    const needsBuild = !fs.existsSync(databasePath);
    this.database = await sqlite.open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    if (needsBuild) {
      await Promise.all([
        buildPronunciationTable(this.database, pronunciationDataPath),
      ]);
    }

    this.searchPronunciationStatement = await this.database.prepare('SELECT resultsJson FROM PronunciationSearchResults WHERE searchTerm = ?');
  }

  async searchPronunciation(searchTerm) {
    const result = await this.searchPronunciationStatement.get(searchTerm);
    await this.searchPronunciationStatement.reset();
    return JSON.parse((result || {}).resultsJson || '[]');
  }
}

module.exports = ResourceDatabase;
