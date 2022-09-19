const globals = require('./../globals.js');
const path = require('path');
const fs = require('fs');
const { CUSTOM_DECK_DIR } = require('kotoba-node-common').constants;
const mongoConnection = require('kotoba-node-common').database.connection;
const CustomDeckModel = require('kotoba-node-common').models.createCustomDeckModel(mongoConnection);
const UserReviewDeckModel = require('kotoba-node-common').models.reviewDeck.createUser(mongoConnection);
const LocationReviewDeckModel = require('kotoba-node-common').models.reviewDeck.createLocation(mongoConnection);

const DeckRequestStatus = {
  ALL_DECKS_FOUND: 0,
  DECK_NOT_FOUND: 1,
  RANGE_INVALID: 2,
};

function createCardGetterFromInMemoryArray(array) {
  return {
    get: i => Promise.resolve(array[i]),
    length: array.length,
    memoryArray: array,
  };
}

function createCardGetterForSqliteDeck(deck) {
  return {
    get: i => {
      const card = globals.resourceDatabase.getQuizQuestion(deck.shortName, i);
      return Promise.resolve(card);
    },
    length: deck.length,
  };
}

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

function createDeckRangeInvalidStatus(deck) {
  return {
    status: DeckRequestStatus.RANGE_INVALID,
    invalidDeckName: deck.shortName,
    validStartIndex: 1,
    validEndIndex: deck.cards.length,
  };
}

function rangeValid(deck) {
  const { startIndex, endIndex } = deck;

  const startIndexDefined = Boolean(startIndex);
  const endIndexDefined = Boolean(endIndex);

  if (startIndexDefined) {
    if (
      startIndex < 1
      || startIndex > deck.cards.length
    ) {
      return false;
    }
  }

  if (endIndexDefined) {
    if (
      endIndex < 1
      || endIndex > deck.cards.length
    ) {
      return false;
    }
  }

  if (startIndexDefined && endIndexDefined) {
    if (startIndex > endIndex) {
      return false;
    }
  }

  return true;
}

function resolveIndex(index, deckLength) {
  return index === Number.MAX_SAFE_INTEGER ? deckLength : index;
}

function shallowCopyDeckAndAddModifiers(deck, deckInformation) {
  const deckCopy = { ...deck };
  deckCopy.startIndex = resolveIndex(deckInformation.startIndex, deck.cards.length);
  deckCopy.endIndex = resolveIndex(deckInformation.endIndex, deck.cards.length);
  deckCopy.mc = deckCopy.forceMC || (deckInformation.mc && !deckCopy.forceNoMC);
  deckCopy.appearanceWeight = deckInformation.appearanceWeight;

  return deckCopy;
}

function getDeckFromMemory(deckInformation) {
  let deck = globals.resourceDatabase.getQuizDeckMeta(deckInformation.deckNameOrUniqueId);

  if (deck) {
    deck.cards = createCardGetterForSqliteDeck(deck);
    deck = shallowCopyDeckAndAddModifiers(deck, deckInformation);
  }

  return deck;
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

  const viewFullDeckPart = deckRaw.restrictToServers?.length > 0 && deckRaw.public === false
    ? ''
    : `[View full deck](https://kotobaweb.com/dashboard/decks/${deckRaw._id}). `;

  const deck = {
    restrictToServers: deckRaw.restrictToServers,
    isInternetDeck: true,
    uniqueId: deckRaw.uniqueId,
    name: deckRaw.name,
    shortName: deckRaw.shortName,
    description: `Custom quiz by ${deckRaw.ownerDiscordUser.username}#${deckRaw.ownerDiscordUser.discriminator}. ${viewFullDeckPart}${deckRaw.description || ''}`,
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

    if (!rangeValid(deck)) {
      return createDeckRangeInvalidStatus(deck);
    }
  }

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

async function updateReviewDeck(unansweredCards, model, id) {
  if (unansweredCards.length > 0) {
    await model.findByIdAndUpdate(
      id,
      { cards: unansweredCards.slice(0, 100), created: Date.now() },
      { upsert: true },
    );
  } else {
    await model.findByIdAndDelete(id);
  }
}

async function getReviewDeck(model, id) {
  const doc = await model.findById(id).lean().exec();
  if (!doc) {
    return undefined;
  }

  return createReviewDeck(doc.cards);
}

function updateUserReviewDeck(unansweredCards, userId) {
  return updateReviewDeck(unansweredCards, UserReviewDeckModel, userId);
}

function updateLocationReviewDeck(unansweredCards, locationId) {
  return updateReviewDeck(unansweredCards, LocationReviewDeckModel, locationId);
}

function getUserReviewDeck(userId) {
  return getReviewDeck(UserReviewDeckModel, userId);
}

function getLocationReviewDeck(locationId) {
  return getReviewDeck(LocationReviewDeckModel, locationId);
}

module.exports = {
  getQuizDecks,
  DeckRequestStatus,
  updateUserReviewDeck,
  updateLocationReviewDeck,
  getUserReviewDeck,
  getLocationReviewDeck,
};
