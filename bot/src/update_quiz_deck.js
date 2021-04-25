const path = require('path');
const ResourceDatabase = require('kotoba-node-common/resources_database/resource_database');
const { default: axios } = require('axios');

async function main() {
  const deckUrl = process.argv[2];

  if (!deckUrl) {
    console.warn('No deck URL argument provided');
    process.exit(2);
  }

  const deckName = deckUrl.substr(deckUrl.lastIndexOf('/') + 1).replace('.json', '');
  const deck = (await axios.get(deckUrl)).data;

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
