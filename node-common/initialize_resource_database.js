const fs = require('fs');
const ResourceDatabase = require('./resource_database.js');

async function initializeResourceDatabase(
  databasePath,
  pronunciationDataPath,
  randomWordDataPath,
) {
  const resourceDatabase = new ResourceDatabase();
  await resourceDatabase.load(
    databasePath,
    pronunciationDataPath,
    randomWordDataPath,
  );

  return resourceDatabase;
}

if (require.main === module) {
  initializeResourceDatabase(
    process.argv[2],
    process.argv[3],
    process.argv[4],
  ).catch((err) => {
    console.warn(err);
    process.exit(1);
  });
}

module.exports = initializeResourceDatabase;
