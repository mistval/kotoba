const path = require('path');
const sqlite = require('better-sqlite3');

function doFTSQueryBenchmark(numQueries = 10_000) {
  const database = sqlite(path.join(__dirname, '..', 'data', 'quiz_fts_meta.dat'));
  database.pragma('journal_mode = WAL;');
  database.pragma('cache_size = 20000;')
  const timerName = `Running a simple FTS query ${numQueries} times`;
  const statement = database.prepare('SELECT deckName, deckFullName FROM QuizDecksMetaFTS WHERE QuizDecksMetaFTS MATCH ? LIMIT ?;');

  console.time(timerName);
  for (let i = 0; i < numQueries; i++) {
    statement.all('jmdict', 10);
  }
  console.timeEnd(timerName);
}

module.exports = {
  doFTSQueryBenchmark,
}
