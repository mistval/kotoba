const path = require('path');
const fs = require('fs');

const CUSTOM_DECK_DIR = path.join(__dirname, '..', 'shared_data', 'custom_decks');

fs.mkdirSync(CUSTOM_DECK_DIR, { recursive: true });

module.exports = {
  CUSTOM_DECK_DIR,
};
