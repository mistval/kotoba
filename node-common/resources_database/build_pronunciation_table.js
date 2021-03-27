const fs = require('fs');

module.exports = function buildPronunciationTable(database, pronunciationDataPath) {
  const pronunciationData = JSON.parse(fs.readFileSync(pronunciationDataPath));
  const searchTerms = Object.keys(pronunciationData);

  database.exec('CREATE TABLE PronunciationSearchResults (searchTerm CHAR(20) PRIMARY KEY, resultsJson TEXT);');
  const insertStatement = database.prepare('INSERT INTO PronunciationSearchResults VALUES (?, ?);');

  const insertTransaction = database.transaction(() => {
    for (let i = 0; i < searchTerms.length; i += 1) {
      const searchTerm = searchTerms[i];
      const results = pronunciationData[searchTerm];

      insertStatement.run(searchTerm, JSON.stringify(results));
    }
  });

  insertTransaction();
}
