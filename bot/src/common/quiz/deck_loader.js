const state = require('./../static_state.js');
const arrayOnDisk = require('disk-array');
const globals = require('./../globals.js');
const path = require('path');
const fs = require('fs');
const { CUSTOM_DECK_DIR } = require('kotoba-node-common').constants;
const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const decksMetadata = require('./../../../generated/quiz/decks.json');

const CACHE_SIZE_IN_PAGES = 1000;

const DeckRequestStatus = {
  ALL_DECKS_FOUND: 0,
  DECK_NOT_FOUND: 1,
};

function createCardGetterFromInMemoryArray(array) {
  return {
    get: i => Promise.resolve(array[i]),
    length: array.length,
    memoryArray: array,
  };
}

function createCardGetterFromDiskArray(array) {
  return array;
}

async function loadDecks() {
  if (state.quizDecksLoader) {
    return;
  }

  state.quizDecksLoader = {
    quizDeckForName: {},
    quizDeckForUniqueId: {},
    quizDecksCache: new arrayOnDisk.Cache(CACHE_SIZE_IN_PAGES),
  };

  const deckNames = Object.keys(decksMetadata);
  const cache = state.quizDecksLoader.quizDecksCache;

  for (let i = 0; i < deckNames.length; i += 1) {
    const deckName = deckNames[i];
    try {
      const deckMetadata = decksMetadata[deckName];
      if (!deckMetadata.uniqueId
        || state.quizDecksLoader.quizDeckForUniqueId[deckMetadata.uniqueId]) {
        throw new Error(`Deck ${deckName} does not have a unique uniqueId, or doesn't have one at all.`);
      }

      // Await makes this code simpler, and the performance is irrelevant.
      // eslint-disable-next-line no-await-in-loop
      const diskArray = await arrayOnDisk.load(deckMetadata.cardDiskArrayPath, cache);
      const deck = JSON.parse(JSON.stringify(deckMetadata));
      deck.cards = createCardGetterFromDiskArray(diskArray);
      deck.isInternetDeck = false;
      state.quizDecksLoader.quizDeckForName[deckName] = deck;
      state.quizDecksLoader.quizDeckForUniqueId[deckMetadata.uniqueId] = deck;
    } catch (err) {
      globals.logger.error({
        event: 'ERROR LOADING DECK',
        detail: deckName,
        err,
      });
    }
  }
}

loadDecks().catch(err => {
  globals.logger.error({
    event: 'ERROR LOADING DECKS',
    err,
  });
});

function createAllDecksFoundStatus(decks) {
  return {
    status: DeckRequestStatus.ALL_DECKS_FOUND,
    decks,
  };
}

function createDeckNotFoundStatus(missingDeckName) {
  return {
    status: DeckRequestStatus.DECK_NOT_FOUND,
    notFoundDeckName: missingDeckName,
  };
}

function resolveIndex(index, deckLength) {
  return index === Number.MAX_SAFE_INTEGER ? deckLength : index;
}

function shallowCopyDeckAndAddModifiers(deck, deckInformation) {
  const deckCopy = Object.assign({}, deck);
  deckCopy.startIndex = resolveIndex(deckInformation.startIndex, deck.cards.length);
  deckCopy.endIndex = resolveIndex(deckInformation.endIndex, deck.cards.length);
  deckCopy.mc = deckCopy.forceMC || (deckInformation.mc && !deckCopy.forceNoMC);

  return deckCopy;
}

function getDeckFromMemory(deckInformation) {
  let deck = state.quizDecksLoader.quizDeckForName[deckInformation.deckNameOrUniqueId]
    || state.quizDecksLoader.quizDeckForUniqueId[deckInformation.deckNameOrUniqueId];

  if (deck) {
    deck = shallowCopyDeckAndAddModifiers(deck, deckInformation);
  }
  return deck;
}

function coerceCardRanges(decks) {
  decks.forEach((deck) => {
    if (Number.isNaN(deck.startIndex)) {
      deck.startIndex = 1;
    }
    if (Number.isNaN(deck.endIndex)) {
      deck.endIndex = deck.cards.length;
    }

    if (deck.startIndex !== undefined || deck.endIndex !== undefined) {
      deck.startIndex = Math.max(1, Math.min(deck.startIndex || 1, deck.cards.length));
      deck.endIndex = Math.max(deck.endIndex || 1, deck.startIndex || 1);
      deck.endIndex = Math.max(1, Math.min(deck.endIndex || 1, deck.cards.length));
    }
  });
}

function readFile(path) {
  return new Promise((fulfill, reject) => {
    fs.readFile(path, 'utf8', (err, text) => {
      if (err) {
        return reject(err);
      }

      fulfill(JSON.parse(text));
    });
  });
}

async function getCustomDeckFromDisk(deckInfo) {
  const deckNameOrUniqueId = deckInfo.deckNameOrUniqueId.toLowerCase();
  let deckRaw;

  try {
    const deckPath = path.join(CUSTOM_DECK_DIR, `${deckNameOrUniqueId}.json`);
    deckRaw = await readFile(deckPath);
  } catch (err) {
    const deckMeta = await CustomDeckModel.findOne({ uniqueId: deckNameOrUniqueId });
    if (deckMeta) {
      const deckPath = path.join(CUSTOM_DECK_DIR, `${deckMeta.shortName}.json`);
      deckRaw = await readFile(deckPath);
    }
  }

  if (!deckRaw) {
    return deckRaw;
  }

  const cards = deckRaw.cards.map(card => {
    if (!card) {
      return card;
    }

    return {
      question: card.question,
      answer: card.answers,
      meaning: card.comment,
      questionCreationStrategy: card.questionCreationStrategy,
      instructions: card.instructions,
    };
  });

  const deck = {
    isInternetDeck: true,
    uniqueId: deckRaw.uniqueId,
    name: deckRaw.name,
    shortName: deckRaw.shortName,
    description: `Custom quiz by ${deckRaw.ownerDiscordUser.username}#${deckRaw.ownerDiscordUser.discriminator}. ${deckRaw.description}`,
    article: 'a',
    dictionaryLinkStrategy: 'NONE',
    answerTimeLimitStrategy: 'JAPANESE_SETTINGS',
    cardPreprocessingStrategy: 'NONE',
    discordFinalAnswerListElementStrategy: 'QUESTION_AND_ANSWER_LINK_QUESTION',
    scoreAnswerStrategy: 'ONE_ANSWER_ONE_POINT',
    additionalAnswerWaitStrategy: 'JAPANESE_SETTINGS',
    discordIntermediateAnswerListElementStrategy: 'CORRECT_ANSWERS',
    answerCompareStrategy: 'CONVERT_KANA',
    commentFieldName: 'Comment',
    cards: createCardGetterFromInMemoryArray(cards),
  };

  return shallowCopyDeckAndAddModifiers(deck, deckInfo);
}

async function getQuizDecks(deckInfos, invokerUserId, invokerUserName) {
  const decks = [];

  // Try to get decks from memory.
  deckInfos.forEach((deckInfo) => {
    decks.push(getDeckFromMemory(deckInfo));
  });

  // For any decks not found in memory, look for them as custom decks on disk.
  const customDeckPromises = decks.map((deck, i) => {
    if (deck) {
      return undefined;
    }

    return getCustomDeckFromDisk(deckInfos[i]).then(customDeck => {
      if (customDeck) {
        decks[i] = customDeck;
      }
    }).catch(err => {
      globals.logger.error({
        event: 'ERROR LOADING CUSTOM DECK',
        err,
      });
    });
  }).filter(x => x);

  await Promise.all(customDeckPromises);

  // If not all decks were found, return error.
  for (let i = 0; i < decks.length; i += 1) {
    const deck = decks[i];
    if (!deck) {
      return createDeckNotFoundStatus(deckInfos[i].deckNameOrUniqueId);
    }
  }

  coerceCardRanges(decks);

  // If all decks were found return success.
  return createAllDecksFoundStatus(decks);
}

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function createReviewDeck(unansweredCards) {
  const cards = deepCopy(unansweredCards);
  cards.forEach((c) => { delete c.deckProgress });

  return {
    uniqueId: 'REVIEW',
    name: 'Review Quiz',
    article: 'a',
    requiresAudioConnection: cards.some(card => card.requiresAudioConnection),
    isInternetDeck: cards.some(card => card.isInternetCard),
    cards: createCardGetterFromInMemoryArray(cards),
  };
}

module.exports = {
  getQuizDecks,
  DeckRequestStatus,
  createReviewDeck,
  loadDecks,
};
