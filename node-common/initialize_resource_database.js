const ResourceDatabase = require('./resource_database.js');

async function initializeResourceDatabase(databasePath, pronunciationDataPath) {
  const resourceDatabase = new ResourceDatabase();
  await resourceDatabase.load(databasePath, pronunciationDataPath);
  return resourceDatabase;
}

if (require.main === module) {
  initializeResourceDatabase(process.argv[2], process.argv[3]);
}

module.exports = initializeResourceDatabase;
