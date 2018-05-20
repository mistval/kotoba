const diskArray = require('disk-array');
const fs = require('fs');
const path = require('path');

function getPathForQuizDeckFile(fileName) {
  return path.resolve(__dirname, '..', '..', 'resources', 'quiz_data', fileName || '');
}

function getDiskArrayDirectoryForDeckName(deckName) {
  return path.resolve(__dirname, '..', '..', 'generated', 'quiz', 'decks', deckName);
}

function mkdirIgnoreError(dir) {
  try {
    fs.mkdirSync(dir);
  } catch (err) {
    // NOOP
  }
}

function writeFile(filePath, content) {
  return new Promise((fulfill, reject) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        return reject(err);
      }
      return fulfill();
    });
  });
}

async function build() {
  mkdirIgnoreError(path.join(__dirname, '..', '..', 'generated'));
  mkdirIgnoreError(path.join(__dirname, '..', '..', 'generated', 'quiz'));
  mkdirIgnoreError(path.join(__dirname, '..', '..', 'generated', 'quiz', 'decks'));

  const deckDataForDeckName = {};

  // Build disk arrays for the quiz decks
  const quizDeckFileNames = fs.readdirSync(getPathForQuizDeckFile());
  for (let i = 0; i < quizDeckFileNames.length; i += 1) {
    const fileName = quizDeckFileNames[i];
    const deckName = fileName.replace('.json', '');
    const deckString = fs.readFileSync(getPathForQuizDeckFile(fileName), 'utf8');
    const deck = JSON.parse(deckString);
    const { cards } = deck;
    const diskArrayDirectory = getDiskArrayDirectoryForDeckName(deckName);
    delete deck.cards;
    deck.cardDiskArrayPath = diskArrayDirectory;

    // We creates the arrays in sequence instead of in parallel
    // because that way there's less memory pressure.
    // eslint-disable-next-line no-await-in-loop
    await diskArray.create(cards, diskArrayDirectory);
    deckDataForDeckName[deckName] = deck;
  }

  const deckDataString = JSON.stringify(deckDataForDeckName, null, 2);
  await writeFile(path.join(__dirname, '..', '..', 'generated', 'quiz', 'decks.json'), deckDataString);
}

module.exports = build;
