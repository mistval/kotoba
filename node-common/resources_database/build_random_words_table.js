const fs = require('fs');

module.exports = function buildRandomWordsTable(database, randomWordDataPath) {
  const randomWordData = JSON.parse(fs.readFileSync(randomWordDataPath));
  const levels = Object.keys(randomWordData);

  database.exec('CREATE TABLE RandomWords (id INTEGER PRIMARY KEY AUTOINCREMENT, level CHAR(5), word CHAR (10));');
  const insertStatement = database.prepare('INSERT INTO RandomWords (level, word) VALUES (?, ?);');

  const insertTransaction = database.transaction(() => {
    for (let i = 0; i < levels.length; i += 1) {
      const level = levels[i];
      const words = randomWordData[level];

      for (let j = 0; j < words.length; j += 1) {
        insertStatement.run(level, words[j]);
      }
    }
  });

  insertTransaction();

  database.exec('CREATE INDEX level ON RandomWords (level);');
}