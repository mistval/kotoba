const buildQuizDecks = require('./build_quiz_decks.js');
const buildShiritoriData = require('./build_shiritori_data.js')

console.log('Building shiritori data');
buildShiritoriData();
console.log('Building quiz data');
buildQuizDecks().then(() => {
  console.log('Done');
});
