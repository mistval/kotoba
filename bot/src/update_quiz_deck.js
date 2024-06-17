const path = require('path');
const ResourceDatabase = require('kotoba-node-common/resources_database/resource_database');
const { default: axios } = require('axios');

async function main() {
  const deckUrlString = process.argv[2];

  if (!deckUrlString) {
    console.warn('No deck URL argument provided');
    process.exit(2);
  }

  const deckUrl = new URL(deckUrlString);
  const deckUrlPath = deckUrl.pathname;
  const deckName = deckUrlPath.substring(deckUrlPath.lastIndexOf('/') + 1).replace('.json', '');
  const deck = (await axios.get(deckUrlString)).data;

  const resourceDatabasePath = path.join(__dirname, '..', 'generated', 'resources.dat');
  const resourcesDatabase = new ResourceDatabase();
  resourcesDatabase.load(resourceDatabasePath);

  resourcesDatabase.updateQuizDeck(deckName, deck);
}

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.warn(err);
  process.exit(1);
});
