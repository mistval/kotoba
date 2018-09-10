const buildQuizDecks = require('./build_quiz_decks.js');
const buildShiritoriData = require('./build_shiritori_data.js')

async function build() {
  console.log('Building shiritori data');
  await buildShiritoriData();
  console.log('Building quiz data');
  await buildQuizDecks();
}

build().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(err => {
  console.warn(err);
  process.exit(1);
});
