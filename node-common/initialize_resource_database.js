const ResourceDatabase = require('./resources_database/resource_database.js');
const fs = require('fs');

function initializeResourceDatabase(
  databasePath,
  pronunciationDataPath,
  randomWordDataPath,
  wordFrequencyDataPath,
  jmdictDataPath,
  fontsPath,
) {
  const resourceDatabase = new ResourceDatabase();
  resourceDatabase.load(
    databasePath,
    pronunciationDataPath,
    randomWordDataPath,
    wordFrequencyDataPath,
    jmdictDataPath,
    fontsPath,
  );

  return resourceDatabase;
}

if (require.main === module) {
  try {
    fs.unlinkSync(process.argv[2]);
  } catch (err)
  {
  }

  return initializeResourceDatabase(
    process.argv[2],
    process.argv[3],
    process.argv[4],
    process.argv[5],
    process.argv[6],
    process.argv[7],
  );
}

module.exports = initializeResourceDatabase;
