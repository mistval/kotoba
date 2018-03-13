const diskArray = require('array-on-disk');
const fs = require('fs');
const path = require('path');

function getPathForQuizDeckFile(fileName) {
  fileName = fileName || '';
  return path.resolve(__dirname, '..', 'kotoba', 'quiz', 'carddecks', fileName);
}

function getDiskArrayDirectoryForDeckName(deckName) {
  return path.resolve('objects', 'quiz', 'decks', deckName);
}

function mkdirIgnoreError(dir) {
  try {
    fs.mkdirSync(dir);
  } catch (err) {
  }
}

function writeFile(path, content) {
  return new Promise((fulfill, reject) => {
    fs.writeFile(path, content, err => {
      if (err) {
        return reject(err);
      }
      return fulfill();
    });
  });
}

module.exports = function() {
  mkdirIgnoreError(path.join(__dirname, '..', 'objects'));
  mkdirIgnoreError(path.join(__dirname, '..', 'objects', 'quiz'));
  mkdirIgnoreError(path.join(__dirname, '..', 'objects', 'quiz', 'decks'));

  const deckDataForDeckName = {};

  // Build disk arrays for the quiz decks
  const quizDeckFileNames = fs.readdirSync(getPathForQuizDeckFile());
  for (let fileName of quizDeckFileNames) {
    const deckName = fileName.replace('.json', '');
    const deck = require(getPathForQuizDeckFile(fileName));
    const cards = deck.cards;
    const diskArrayDirectory = getDiskArrayDirectoryForDeckName(deckName);
    delete deck.cards;
    deck.cardDiskArrayPath = diskArrayDirectory;
    diskArray.create(cards, diskArrayDirectory);
    deckDataForDeckName[deckName] = deck;
  }

  const deckDataString = JSON.stringify(deckDataForDeckName, null, 2);
  writeFile(path.join(__dirname, '..', 'objects', 'quiz', 'decks.json'), deckDataString);
}
