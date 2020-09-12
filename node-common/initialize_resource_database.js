const ResourceDatabase = require('./resource_database.js');
const fs = require('fs');

async function initializeResourceDatabase(
  databasePath,
  pronunciationDataPath,
  randomWordDataPath,
  wordFrequencyDataPath,
  jmdictDataPath,
) {
  const resourceDatabase = new ResourceDatabase();
  await resourceDatabase.load(
    databasePath,
    pronunciationDataPath,
    randomWordDataPath,
    wordFrequencyDataPath,
    jmdictDataPath,
  );

  return resourceDatabase;
}

if (require.main === module) {
  fs.promises.unlink(process.argv[2])
    .catch(() => {})
    .then(() => {
      return initializeResourceDatabase(
        process.argv[2],
        process.argv[3],
        process.argv[4],
        process.argv[5],
        process.argv[6],
      );
    }).catch((err) => {
      console.warn(err);
      process.exit(1);
    });
}

module.exports = initializeResourceDatabase;
