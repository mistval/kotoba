const fs = require('fs');
const path = require('path');
const buildPronunciationTable = require('./build_pronunciation_table.js');
const buildRandomWordsTable = require('./build_random_words_table.js');
const buildShiritoriTable = require('./build_shiritori_table.js');
const buildFontCharacterTable = require('./build_font_character_table.js');
const buildKanjiVgTable = require('./build_kanji_vg_table.js');
const { buildDeckTables, updateDeck } = require('./build_quiz_tables.js');

class ResourceDatabase {
  load(databasePath, pronunciationDataPath, randomWordDataPath, wordFrequencyDataPath, jmdictPath, fontsPath, quizDataPath, kanjiVgPath) {
    this.characterStatementForKey = {};

    const needsBuild = !fs.existsSync(databasePath);
    if (needsBuild && (
      !pronunciationDataPath
      || !randomWordDataPath
      || !wordFrequencyDataPath
      || !jmdictPath
      || !fontsPath
      || !quizDataPath
      || !kanjiVgPath
    )) {
      throw new Error('Cannot build resource database. Required resource paths not provided.');
    }

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    const sqlite = require('better-sqlite3');
    this.database = sqlite(databasePath);
    this.database.pragma('journal_mode = WAL;');
    this.database.pragma('cache_size = 20000;')

    if (needsBuild) {
      buildKanjiVgTable(this.database, kanjiVgPath);
      buildDeckTables(this.database, quizDataPath);
      buildFontCharacterTable(this.database, fontsPath);
      buildPronunciationTable(this.database, pronunciationDataPath);
      buildRandomWordsTable(this.database, randomWordDataPath);
      buildShiritoriTable(this.database, wordFrequencyDataPath, jmdictPath);
      this.database.exec('VACUUM;');
    }

    this.searchPronunciationStatement = this.database.prepare('SELECT resultsJson FROM PronunciationSearchResults WHERE searchTerm = ?;');
    this.searchShiritoriStatement = this.database.prepare('SELECT data FROM ShiritoriWords WHERE word = ? OR reading = ?;');
    this.getNumRandomWordsStatement = this.database.prepare('SELECT COUNT(*) as count FROM RandomWords WHERE level = ?;');
    this.getRandomWordByLevelStatement = this.database.prepare('SELECT word FROM RandomWords WHERE level = ? LIMIT (ABS(RANDOM()) % ?), 1;');
    this.getRandomWordStatement = this.database.prepare('SELECT word FROM RandomWords WHERE id = ABS(RANDOM()) %(SELECT COUNT(*) FROM RandomWords);');
    this.getQuizQuestionStatement = this.database.prepare('SELECT questionJson FROM QuizQuestions WHERE deckName = ? AND idx = ?;');
    this.getQuizDeckMetaStatement = this.database.prepare('SELECT metaJson FROM QuizDecksMeta WHERE deckName = ? OR deckUniqueId = ?;');
    this.prefixSearchQuizDeckShortNamesStatement = this.database.prepare('SELECT deckName AS shortName, deckFullName AS name FROM QuizDecksMeta WHERE deckName LIKE ? LIMIT ?;');
    this.fullTextSearchQuizDeckMetaStatement = this.database.prepare('SELECT deckName AS shortName, deckFullName AS name FROM QuizDecksMetaFTS WHERE QuizDecksMetaFTS MATCH ? LIMIT ?;')
    this.getStrokeDataStatement = this.database.prepare('SELECT strokeDataJson FROM StrokeData WHERE kanji = ?;');
  }

  getQuizQuestion(deckName, index) {
    const result = this.getQuizQuestionStatement.get(deckName, index);
    return result && JSON.parse(result.questionJson);
  }

  getQuizDeckMeta(deckName) {
    const result = this.getQuizDeckMetaStatement.get(deckName, deckName);
    return result && JSON.parse(result.metaJson);
  }

  prefixSearchQuizDeckShortNames(searchTerm, limit) {
    const sanitizedSearchTerm = searchTerm.replaceAll('_', '').replaceAll('%', '');
    const results = this.prefixSearchQuizDeckShortNamesStatement.all(`${sanitizedSearchTerm}%`, limit);
    return results;
  }

  fullTextSearchQuizDecks(searchTerm, limit) {
    const results = this.prefixSearchQuizDeckShortNamesStatement.all(searchTerm, limit);
    return results;
  }

  getFontsHaveAllCharacters(fontFileNames, str) {
    const chars = [...new Set(str)];

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

  getStrokeData(kanji) {
    const result = this.getStrokeDataStatement.get(kanji);
    return JSON.parse((result || {}).strokeDataJson || 'null');
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

  updateQuizDeck(deckName, deck) {
    updateDeck(this.database, deckName, deck);
  }
}

module.exports = ResourceDatabase;
