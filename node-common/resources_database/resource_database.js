const fs = require('fs');
const path = require('path');
const buildPronunciationTable = require('./build_pronunciation_table.js');
const buildRandomWordsTable = require('./build_random_words_table.js');
const buildShiritoriTable = require('./build_shiritori_table.js');
const buildFontCharacterTable = require('./build_font_character_table.js');

class ResourceDatabase {
  load(databasePath, pronunciationDataPath, randomWordDataPath, wordFrequencyDataPath, jmdictPath, fontsPath) {
    this.characterStatementForKey = {};

    const needsBuild = !fs.existsSync(databasePath);
    if (needsBuild && (
      !pronunciationDataPath
      || !randomWordDataPath
      || !wordFrequencyDataPath
      || !jmdictPath
      || !fontsPath
    )) {
      throw new Error('Cannot build resource database. Required resource paths not provided.');
    }

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    const sqlite = require('better-sqlite3');
    this.database = sqlite(databasePath);
    this.database.pragma('journal_mode = WAL');

    if (needsBuild) {
      buildFontCharacterTable(this.database, fontsPath);
      buildPronunciationTable(this.database, pronunciationDataPath);
      buildRandomWordsTable(this.database, randomWordDataPath);
      buildShiritoriTable(this.database, wordFrequencyDataPath, jmdictPath);
    }

    this.searchPronunciationStatement = this.database.prepare('SELECT resultsJson FROM PronunciationSearchResults WHERE searchTerm = ?;');
    this.searchShiritoriStatement = this.database.prepare('SELECT data FROM ShiritoriWords WHERE word = ? OR reading = ?;');
    this.getNumRandomWordsStatement = this.database.prepare('SELECT COUNT(*) as count FROM RandomWords WHERE level = ?;');
    this.getRandomWordByLevelStatement = this.database.prepare('SELECT word FROM RandomWords WHERE level = ? LIMIT (ABS(RANDOM()) % ?), 1;');
    this.getRandomWordStatement = this.database.prepare('SELECT word FROM RandomWords WHERE id = ABS(RANDOM()) %(SELECT COUNT(*) FROM RandomWords);');
  }

  getFontsHaveAllCharacters(fontFileNames, str) {
    const chars = [...new Set(...str)];

    // Making a separate prepared statement for each string length has much better
    // query performance than using the INSTR function.
    const statementKey = `${fontFileNames.length}-${chars.length}`;
    if (!this.characterStatementForKey[statementKey]) {
      const characterQuestionMarks = Array(chars.length).fill('?');
      const fontQuestionMarks = Array(fontFileNames.length).fill('?');
      this.characterStatementForKey[statementKey] = this.database.prepare(`
SELECT COUNT(DISTINCT character) = ${chars.length} AS hasAll
FROM FontCharacters
WHERE fontFileName IN (${fontQuestionMarks.join(',')}) AND character IN (${characterQuestionMarks.join(',')});
      `);
    }

    return this.characterStatementForKey[statementKey].get(...fontFileNames, ...chars).hasAll === 1;
  }

  getShiritoriWords(searchTermAsHiragana) {
    const results = this.searchShiritoriStatement.all(
      searchTermAsHiragana,
      searchTermAsHiragana,
    );

    return results.map(r => JSON.parse(r.data));
  }

  searchPronunciation(searchTerm) {
    const result = this.searchPronunciationStatement.get(searchTerm);
    return JSON.parse((result || {}).resultsJson || '[]');
  }

  getRandomWord(level) {
    if (level) {
      const count = this.getNumRandomWordsStatement.get(level);
      if (count.count > 0) {
        const levelResult = this.getRandomWordByLevelStatement.get(level, count.count);
        if (levelResult) {
          return levelResult.word;
        }
      }
    }

    const result = this.getRandomWordStatement.get();
    return result.word;
  }
}

module.exports = ResourceDatabase;
