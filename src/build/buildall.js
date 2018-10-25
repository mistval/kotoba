const buildQuizDecks = require('./build_quiz_decks.js');
const buildShiritoriData = require('./build_shiritori_data.js');
const buildPronounceData = require('./build_pronunciation_data.js');

async function build() {
  await buildPronounceData();
  await buildShiritoriData();
  await buildQuizDecks();
}

build().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(err => {
  console.warn(err);
  process.exit(1);
});
