const diskArray = require('disk-array');
const fs = require('fs');
const path = require('path');

const LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_FROM = 'Reading Quiz';
const LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_TO = 'Listening Vocabulary Quiz';
const LISTENING_VOCAB_DECK_PREPROCESSING_STRATEGY = 'FORVO_AUDIO_CACHE';
const LISTENING_VOCAB_DECK_INSTRUCTIONS = 'Listen to the audio and type the word (**in Kanji**)';
const LISTENING_VOCAB_DECK_QUESTION_CREATION_STRATEGY = 'FORVO_AUDIO_FILE';
const LISTENING_VOCAB_DECK_DICTIONARY_LINK_STRATEGY = 'JISHO_ANSWER_WORD';
const LISTENING_VOCAB_DECK_DISCORD_FINAL_ANSWER_LIST_ELEMENT_STRATEGY = 'FORVO_AUDIO_LINK';
const LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX = 'lv';

const listeningVocabDeckSourceDeckNames = [
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

  sourceDeckCopy.uniqueId = `${LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX}_${sourceDeckCopy.uniqueId}`;
  sourceDeckCopy.name = sourceDeckCopy.name.replace(
    LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_FROM,
    LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_TO,
  );
  sourceDeckCopy.instructions = LISTENING_VOCAB_DECK_INSTRUCTIONS;
  sourceDeckCopy.questionCreationStrategy = LISTENING_VOCAB_DECK_QUESTION_CREATION_STRATEGY;
  sourceDeckCopy.dictionaryLinkStrategy = LISTENING_VOCAB_DECK_DICTIONARY_LINK_STRATEGY;
  sourceDeckCopy.discordFinalAnswerListElementStrategy
    = LISTENING_VOCAB_DECK_DISCORD_FINAL_ANSWER_LIST_ELEMENT_STRATEGY;
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
  console.log('Building quiz data');

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
    if (listeningVocabDeckSourceDeckNames.indexOf(deckName) !== -1) {
      const wordIDDeck = createWordIdentificationDeckFromSource(deck);
      const wordIDDeckName = `${LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX}${deckName}`;
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

if (require.main === module) {
  build().then(() => {
    console.log('done');
    process.exit(0);
  }).catch((err) => {
    console.warn(err);
    process.exit(1);
  });
}

module.exports = build;
