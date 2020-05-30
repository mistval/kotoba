const buildQuizDecks = require('./build_quiz_decks.js');

async function build() {
  await buildQuizDecks();
}

build().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((err) => {
  console.warn(err);
  process.exit(1);
});
