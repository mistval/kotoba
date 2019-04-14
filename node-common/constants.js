const path = require('path');
const mkdirp = require('mkdirp');

const CUSTOM_DECK_DIR = path.join(__dirname, '..', 'shared_data', 'custom_decks');

mkdirp.sync(CUSTOM_DECK_DIR);

module.exports = {
  CUSTOM_DECK_DIR,
};
