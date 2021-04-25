const fs = require('fs');
const path = require('path');

const LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_FROM = 'Reading Quiz';
const LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_TO = 'Listening Vocabulary Quiz';
const LISTENING_VOCAB_DECK_INSTRUCTIONS = 'Listen to the audio and type the word (**in Kanji**)';
const LISTENING_VOCAB_DECK_QUESTION_CREATION_STRATEGY = 'FORVO_AUDIO_FILE';
const LISTENING_VOCAB_DECK_CARD_PREPROCESSING_STRATEGY = 'FORVO_AUDIO';
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

const MEANING_DECK_NAME_REPLACE_STRING_FROM = 'Reading Quiz';
const MEANING_DECK_NAME_REPLACE_STRING_TO = 'Meaning Quiz';
const MEANING_DECK_NAME_SHORT_SUFFIX = 'm';
const MEANING_DECK_COMMENT_FIELD_NAME = 'Reading';

const meaningDeckSourceDeckNames = [
  'n1',
  'n3',
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
  'animals',
  'birds',
  'bugs',
  'common',
  'countries',
  'fish',
  'hard',
  'kklc',
  'vegetables',
  'plants',
  'kokuji',
];

function assertNoDuplicateCards(deckName, deck) {
  const seen = {};
  deck.cards.filter(x => x).forEach((card) => {
    if (seen[card.question]) {
      throw new Error(`Duplicate question in ${deckName}: ${card.question}`);
    }
    seen[card.question] = true;

    const uniqueAnswers = [...new Set(card.answer)];
    if (uniqueAnswers.length !== card.answer.length) {
      throw new Error(`Duplicate answer in ${deckName}: ${card.question}: ${JSON.stringify(card.answer)}`);
    }

    if (card.options) {
      const uniqueOptions = [...new Set(card.options)];
      if (uniqueOptions.length !== card.options.length) {
        throw new Error(`Duplicate option in ${deckName}: ${card.question}: ${JSON.stringify(card.options)}`);
      }
    }
  });
}

function assertHasAnswer(deckName, card) {
  if (card && card.answer.filter(x => x).length === 0) {
    throw new Error(`Question: ${card.question} in deck: ${deckName} has no answer.`);
  }
}

function assertNoEmptyAnswers(deckName, deck) {
  deck.cards.forEach((card) => {
    if (card && card.answer.some(a => !a.trim())) {
      throw new Error(`Question: ${card.question} in deck: ${deckName} has a falsy answer`);
    }
  });
}

function assertNoAnswerlessQuestions(deckName, deck) {
  if (deck.cardPreprocessingStrategy === 'THESAURUS_SYNONYMS') {
    // The answers get added during preprocessing.
    return;
  }

  deck.cards.forEach(card => assertHasAnswer(deckName, card));
}

function insertCards(database, deckName, cards) {
  const insertStatement = database.prepare(`INSERT INTO QuizQuestions VALUES ('${deckName}', ?, ?);`);

  const insertTransaction = database.transaction(() => {
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      insertStatement.run(i, JSON.stringify(card));
    }
  });

  insertTransaction();
}

function insertMeta(database, deckName, deck) {
  const deckCopy = { ...deck, shortName: deckName, length: deck.cards.length };
  delete deckCopy.cards;

  const insertStatement = database.prepare(`INSERT INTO QuizDecksMeta VALUES (?, ?, ?);`);
  insertStatement.run(deckName, deck.uniqueId, JSON.stringify(deckCopy));
}

function updateDeck(database, deckName, deck) {
  const deleteMetaStatement = database.prepare('DELETE FROM QuizDecksMeta WHERE deckName = ?;');
  const deleteCardsStatement = database.prepare(`DELETE FROM QuizQuestions WHERE deckName = ?;`);

  const updateTransaction = database.transaction(() => {
    deleteMetaStatement.run(deckName);
    deleteCardsStatement.run(deckName);

    insertMeta(database, deckName, deck);
    insertCards(database, deckName, deck.cards);
  });

  updateTransaction();
}

function createWordIdentificationDeck(database, sourceDeckName, sourceDeck) {
  if (listeningVocabDeckSourceDeckNames.indexOf(sourceDeckName) === -1) {
    return;
  }

  const sourceDeckCopy = { ...sourceDeck };

  sourceDeckCopy.uniqueId = `${LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX}_${sourceDeckCopy.uniqueId}`;
  sourceDeckCopy.name = sourceDeckCopy.name.replace(
    LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_FROM,
    LISTENING_VOCAB_DECK_NAME_REPLACE_STRING_TO,
  );

  sourceDeckCopy.cardPreprocessingStrategy = LISTENING_VOCAB_DECK_CARD_PREPROCESSING_STRATEGY;
  sourceDeckCopy.instructions = LISTENING_VOCAB_DECK_INSTRUCTIONS;
  sourceDeckCopy.questionCreationStrategy = LISTENING_VOCAB_DECK_QUESTION_CREATION_STRATEGY;
  sourceDeckCopy.dictionaryLinkStrategy = LISTENING_VOCAB_DECK_DICTIONARY_LINK_STRATEGY;
  sourceDeckCopy.discordFinalAnswerListElementStrategy
    = LISTENING_VOCAB_DECK_DISCORD_FINAL_ANSWER_LIST_ELEMENT_STRATEGY;
  sourceDeckCopy.requiresAudioConnection = true;

  sourceDeckCopy.cards = sourceDeckCopy.cards
    .map(card => card && { ...card, answer: card.question });

  const wordIDDeckName = `${LISTENING_VOCAB_DECK_NAME_SHORT_NAME_PREFIX}${sourceDeckName}`;

  insertCards(database, wordIDDeckName, sourceDeckCopy.cards);
  insertMeta(database, wordIDDeckName, sourceDeckCopy);
}

function createMeaningDeck(database, sourceDeckName, sourceDeck) {
  if (meaningDeckSourceDeckNames.indexOf(sourceDeckName) === -1) {
    return;
  }

  const sourceDeckCopy = { ...sourceDeck };

  sourceDeckCopy.uniqueId = `${sourceDeckCopy.uniqueId}${MEANING_DECK_NAME_SHORT_SUFFIX}`;
  sourceDeckCopy.commentFieldName = MEANING_DECK_COMMENT_FIELD_NAME;
  sourceDeckCopy.name = sourceDeckCopy.name.replace(
    MEANING_DECK_NAME_REPLACE_STRING_FROM,
    MEANING_DECK_NAME_REPLACE_STRING_TO,
  );

  sourceDeckCopy.forceMC = true;
  sourceDeckCopy.cards = sourceDeckCopy.cards
    .filter(card => card && card.meaning)
    .map(card => ({
      question: card.question,
      answer: [card.meaning],
      meaning: card.answer[0],
    }));

  const meaningDeckName = `${sourceDeckName}${MEANING_DECK_NAME_SHORT_SUFFIX}`;

  insertCards(database, meaningDeckName, sourceDeckCopy.cards);
  insertMeta(database, meaningDeckName, sourceDeckCopy);
}

function buildDeckTables(database, quizDataPath) {
  database.exec('CREATE TABLE QuizQuestions (deckName CHAR(20), idx INT, questionJson TEXT);');
  database.exec('CREATE TABLE QuizDecksMeta (deckName CHAR(20), deckUniqueId CHAR(20), metaJson TEXT);');

  const quizDeckFileNames = fs.readdirSync(quizDataPath);
  quizDeckFileNames.forEach((fileName) => {
    try {
      const deckPath = path.join(quizDataPath, fileName);
      const deckName = fileName.replace('.json', '');

      const deckString = fs.readFileSync(deckPath, 'utf8');
      const deck = JSON.parse(deckString);

      assertNoDuplicateCards(deckName, deck);
      assertNoAnswerlessQuestions(deckName, deck);
      assertNoEmptyAnswers(deckName, deck);

      insertCards(database, deckName, deck.cards);
      insertMeta(database, deckName, deck);

      createWordIdentificationDeck(database, deckName, deck);
      createMeaningDeck(database, deckName, deck);
    } catch (err) {
      console.warn(`Error building ${fileName}`);
      throw err;
    }
  });

  database.exec('CREATE UNIQUE INDEX quizQuestionsIndex ON QuizQuestions (deckName, idx);');
  database.exec('CREATE UNIQUE INDEX quizMetaNameIndex ON QuizDecksMeta (deckName);');
  database.exec('CREATE UNIQUE INDEX quizMetaUniqueIdIndex ON QuizDecksMeta (deckUniqueId);');
}

module.exports = {
  buildDeckTables,
  updateDeck,
};
