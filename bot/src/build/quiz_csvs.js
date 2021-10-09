const fs = require('fs');
const path = require('path');

// eslint-disable-next-line import/no-extraneous-dependencies
const csvStringify = require('csv-stringify/lib/sync');

const QUIZ_FILE_DIR = path.join(__dirname, '..', '..', '..', 'resources', 'quiz_data');
const OUTPUT_DIR = path.join('.', 'quiz_csvs');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function filterDeck(deckFileName) {
  if (deckFileName.startsWith('anagrams')) {
    return false;
  }

  if (deckFileName.startsWith('esyn')) {
    return false;
  }

  if (deckFileName.startsWith('images')) {
    return false;
  }

  if (deckFileName.startsWith('jsyn')) {
    return false;
  }

  if (deckFileName.startsWith('k_')) {
    return false;
  }

  if (deckFileName === 'places_full.json') {
    return false;
  }

  if (deckFileName === 'ranobe.json') {
    return false;
  }

  if (deckFileName.startsWith('defs')) {
    return false;
  }

  if (deckFileName === 'dqn') {
    return false;
  }

  return true;
}

const quizFileNames = fs.readdirSync(QUIZ_FILE_DIR).filter(filterDeck);

async function go() {
  for (let i = 0; i < quizFileNames.length; i += 1) {
    const fileName = quizFileNames[i];
    const filePath = path.join(QUIZ_FILE_DIR, fileName);

    // eslint-disable-next-line import/no-dynamic-require,global-require
    const deck = JSON.parse(fs.readFileSync(filePath));

    const cardsAsRows = deck.cards.filter((c) => c).map((card) => [
      card.question,
      card.answer.join(', '),
      card.meaning,
      deck.instructions,
    ]);

    cardsAsRows.unshift(['Question', 'Answers', 'Comment', 'Instructions']);

    const csvStr = csvStringify(cardsAsRows);
    const csvFileName = fileName.replace('.json', '.csv');

    fs.writeFileSync(path.join(OUTPUT_DIR, csvFileName), csvStr);
  }
}

go()
  .catch((err) => { console.warn(err); });
