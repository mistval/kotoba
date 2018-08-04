const diskArray = require('disk-array');
const fs = require('fs');
const path = require('path');

const WORD_ID_DECK_NAME_REPLACE_STRING_FROM = 'Reading Quiz';
const WORD_ID_DECK_NAME_REPLACE_STRING_TO = 'Word Identification Quiz';
const WORD_ID_DECK_PREPROCESSING_STRATEGY = 'FORVO_AUDIO_CACHE';
const WORD_ID_DECK_INSTRUCTIONS = 'Listen to the audio and type the word (in Kanji)';
const WORD_ID_DECK_QUESTION_CREATION_STRATEGY = 'FORVO_AUDIO_FILE';
const WORD_ID_DECK_DICTIONARY_LINK_STRATEGY = 'JISHO_ANSWER_WORD';
const WORD_ID_DECK_DISCORD_FINAL_ANSWER_LIST_ELEMENT_STRATEGY = 'QUESTION_AND_ANSWER_LINK_ANSWER';
const WORD_ID_DECK_NAME_SHORT_NAME_PREFIX = 'wd';

const wordIdentificationDeckSourceDeckNames = [
  'n1',
  'n2',
  'n3',
  'n4',
  'n5',
  '1k',
  'j1k',
  '2k',
  'j2k',
  '3k',
  '4k',
  '5k',
  '6k',
  '7k',
  '8k',
  '9k',
  '10k',
];

function createWordIdentificationDeckFromSource(sourceDeck) {
  const sourceDeckCopy = JSON.parse(JSON.stringify(sourceDeck));

  sourceDeckCopy.uniqueId = `${WORD_ID_DECK_NAME_SHORT_NAME_PREFIX}_${sourceDeckCopy.uniqueId}`;
  sourceDeckCopy.name = sourceDeckCopy.name.replace(
    WORD_ID_DECK_NAME_REPLACE_STRING_FROM,
    WORD_ID_DECK_NAME_REPLACE_STRING_TO,
  );
  sourceDeckCopy.instructions = WORD_ID_DECK_INSTRUCTIONS;
  sourceDeckCopy.questionCreationStrategy = WORD_ID_DECK_QUESTION_CREATION_STRATEGY;
  sourceDeckCopy.dictionaryLinkStrategy = WORD_ID_DECK_DICTIONARY_LINK_STRATEGY;
  sourceDeckCopy.discordFinalAnswerListElementStrategy
    = WORD_ID_DECK_DISCORD_FINAL_ANSWER_LIST_ELEMENT_STRATEGY;
  sourceDeckCopy.requiresAudioConnection = true;

  sourceDeckCopy.cards.forEach(card => {
    if (card) {
      card.answer = [card.question];
    }
  });

  return sourceDeckCopy;
}

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

    const diskArrayDirectory = getDiskArrayDirectoryForDeckName(deckName);
    deck.cardDiskArrayPath = diskArrayDirectory;

    // We creates the arrays in sequence instead of in parallel
    // because that way there's less memory pressure.
    // eslint-disable-next-line no-await-in-loop
    await diskArray.create(deck.cards, diskArrayDirectory);

    // Create the corresponding word identification deck, if applicable
    if (wordIdentificationDeckSourceDeckNames.indexOf(deckName) !== -1) {
      const wordIDDeck = createWordIdentificationDeckFromSource(deck);
      const wordIDDeckName = `${WORD_ID_DECK_NAME_SHORT_NAME_PREFIX}${deckName}`;
      const wordIDDiskArrayDirectory = getDiskArrayDirectoryForDeckName(wordIDDeckName);

      await diskArray.create(wordIDDeck.cards, wordIDDiskArrayDirectory);
      delete wordIDDeck.cards;
      wordIDDeck.cardDiskArrayPath = wordIDDiskArrayDirectory;
      deckDataForDeckName[wordIDDeckName] = wordIDDeck;
    }

    delete deck.cards;
    deckDataForDeckName[deckName] = deck;
  }

  const deckDataString = JSON.stringify(deckDataForDeckName, null, 2);
  await writeFile(path.join(__dirname, '..', '..', 'generated', 'quiz', 'decks.json'), deckDataString);
}

module.exports = build;
