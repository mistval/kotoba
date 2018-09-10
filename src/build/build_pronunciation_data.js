const pronounceDb = require('./../common/pronunciation_db.js');

const VERBOSE = true;

function log(str) {
  if (VERBOSE) {
    console.log(`-- ${str}`);
  }
}

async function build() {
  const pronunciationData = require('./../../resources/dictionaries/pronunciation.json');

  log('Clearing prounciation DB');
  await pronounceDb.clearPronunciationInfo();
  log('Entering pronunciation info into DB');

  const searchTerms = Object.keys(pronunciationData);
  let promises = [];

  for (let i = 0; i < searchTerms.length; ++i) {
    const searchTerm = searchTerms[i];
    const words = pronunciationData[searchTerm];

    promises.push(pronounceDb.addEntry(searchTerm, words));

    // To keep down memory usage
    if (promises.length >= 1000) {
      await Promise.all(promises);
      promises = [];
    }

    if (i % 10000 === 0) {
      log(`Search terms entered into DB: ${i}`);
    }
  }

  return Promise.all(promises);
}

module.exports = build;
