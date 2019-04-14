const reload = require('require-reload')(require);
const state = require('./../static_state.js');
const assert = require('assert');
const request = require('request-promise');
const arrayOnDisk = require('disk-array');
const globals = require('./../globals.js');
const path = require('path');
const fs = require('fs');
const { throwPublicErrorInfo } = require('../../common/util/errors.js');
const { CUSTOM_DECK_DIR } = require('kotoba-node-common').constants;

const { PublicError } = require('monochrome-bot');
const decksMetadata = reload('./../../../generated/quiz/decks.json');
const cardStrategies = reload('./card_strategies.js');

const LOGGER_TITLE = 'QUIZ DECK LOADER';
const PASTEBIN_REGEX = /pastebin\.com\/(?:raw\/)?(.*)/;
const QUESTIONS_START_IDENTIFIER = '--QuestionsStart--';
const MAX_DECKS_PER_USER = 100;
const CACHE_SIZE_IN_PAGES = 1000;

const DeckRequestStatus = {
  ALL_DECKS_FOUND: 0,
  DECK_NOT_FOUND: 1,
  INDEX_OUT_OF_RANGE: 2,
};

const DeletionStatus = {
  DELETED: 0,
  DECK_NOT_FOUND: 1,
  USER_NOT_OWNER: 2,
};

const QuestionCreationStrategyForQuestionType = {
  IMAGE: 'IMAGE',
  TEXT: 'TEXT',
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

function validateDeckPropertiesValid(deck) {
  assert(deck.name, 'No name.');
  assert(deck.article, 'No article.');
  assert(deck.instructions, 'No instructions.');
  assert(deck.cards, 'No cards.');
  assert(deck.commentFieldName, 'No comment field name');
  assert(Object.keys(cardStrategies.CreateQuestionStrategy).indexOf(deck.questionCreationStrategy) !== -1, 'No or invalid question creation strategy.');
  assert(Object.keys(cardStrategies.CreateDictionaryLinkStrategy).indexOf(deck.dictionaryLinkStrategy) !== -1, 'No or invalid dictionary link strategy.');
  assert(Object.keys(cardStrategies.AnswerTimeLimitStrategy).indexOf(deck.answerTimeLimitStrategy) !== -1, 'No or invalid answer time limit strategy.');
  assert(Object.keys(cardStrategies.CardPreprocessingStrategy).indexOf(deck.cardPreprocessingStrategy) !== -1, 'No or invalid preprocessing strategy.');
  assert(Object.keys(cardStrategies.ScoreAnswerStrategy).indexOf(deck.scoreAnswerStrategy) !== -1, 'No or invalid score answer strategy.');
  assert(Object.keys(cardStrategies.AdditionalAnswerWaitStrategy).indexOf(deck.additionalAnswerWaitStrategy !== -1), 'No or invalid additional answer wait strategy.');
  assert(Object.keys(cardStrategies.AnswerCompareStrategy).indexOf(deck.answerCompareStrategy !== -1), 'No or invalid answerCompareStrategy.');
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
      globals.logger.logFailure(LOGGER_TITLE, `Error loading deck ${deckName}`, err);
    }
  }
}

loadDecks().catch(err => {
  globals.logger.logFailure(LOGGER_TITLE, `Error loading decks`, err);
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

function shallowCopyDeckAndAddModifiers(deck, deckInformation) {
  const deckCopy = Object.assign({}, deck);
  deckCopy.startIndex = deckInformation.startIndex;
  deckCopy.endIndex = deckInformation.endIndex;
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

function throwParsePublicError(errorReason, lineIndex, uri) {
  throw PublicError.createWithCustomPublicMessage(`Error parsing deck data at <${uri}> line ${lineIndex + 1}: ${errorReason}`, false, 'Community deck validation error');
}

function tryCreateDeckFromRawData(data, uri) {
  // data = data.replace(/\r\n/g, '\n'); // Uncomment for testing with embedded data.
  const lines = data.split('\r\n');
  let lineIndex = 0;

  // Parse and validate header
  let deckName;
  let instructions;
  let shortName;
  let questionCreationStrategy;
  for (
    ;
    lineIndex < lines.length && !lines[lineIndex].startsWith(QUESTIONS_START_IDENTIFIER);
    lineIndex += 1
  ) {
    if (lines[lineIndex].startsWith('FULL NAME:')) {
      deckName = lines[lineIndex].replace('FULL NAME:', '').trim();
      if (deckName.length > 80) {
        throwParsePublicError('FULL NAME must be shorter than 80 characters.', lineIndex, uri);
      }
    } else if (lines[lineIndex].startsWith('INSTRUCTIONS:')) {
      instructions = lines[lineIndex].replace('INSTRUCTIONS:', '').trim();
      if (instructions.length > 100) {
        throwParsePublicError('INSTRUCTIONS must be shorter than 100 characters.', lineIndex, uri);
      }
    } else if (lines[lineIndex].startsWith('SHORT NAME:')) {
      shortName = lines[lineIndex].replace('SHORT NAME:', '').trim().toLowerCase();
      if (shortName.length > 20) {
        throwParsePublicError('SHORT NAME must be shorter than 20 characters.', lineIndex, uri);
      } else if (shortName.indexOf('+') !== -1) {
        throwParsePublicError('SHORT NAME must not contain a + symbol.', lineIndex, uri);
      } else if (shortName.indexOf(' ') !== -1) {
        throwParsePublicError('SHORT NAME must not contain any spaces.', lineIndex, uri);
      }
    } else if (lines[lineIndex].startsWith('QUESTION TYPE:')) {
      const questionType = lines[lineIndex].replace('QUESTION TYPE:', '').trim().toUpperCase();
      if (!QuestionCreationStrategyForQuestionType[questionType]) {
        throwParsePublicError(`QUESTION TYPE must be one of the following: ${Object.keys(QuestionCreationStrategyForQuestionType).join(', ')}`, lineIndex, uri);
      }
      questionCreationStrategy = QuestionCreationStrategyForQuestionType[questionType];
    }
  }

  if (!deckName) {
    throwParsePublicError('Deck must have a NAME', 0, uri);
  } else if (!shortName) {
    throwParsePublicError('Deck must have a SHORT NAME', 0, uri);
  } else if (!lines[lineIndex] || !lines[lineIndex].startsWith(QUESTIONS_START_IDENTIFIER)) {
    throwParsePublicError(`Did not find ${QUESTIONS_START_IDENTIFIER} separator. You must put your questions below --QuestionsStart--`, 0, uri);
  } else if (!instructions) {
    throwParsePublicError('Deck must have INSTRUCTIONS', 0, uri);
  }

  if (!questionCreationStrategy) {
    questionCreationStrategy = 'IMAGE';
  }

  // Parse and validate questions
  const cards = [];
  lineIndex += 1;
  for (; lineIndex < lines.length; lineIndex += 1) {
    if (lines[lineIndex]) {
      const parts = lines[lineIndex].split(',');
      const question = parts[0];
      const answers = parts[1];
      const meaning = parts[2];

      if (!question) {
        throwParsePublicError('No question', lineIndex, uri);
      } else if (!answers) {
        throwParsePublicError('No answers', lineIndex, uri);
      } else if (question.length > 10 && questionCreationStrategy === 'IMAGE') {
        throwParsePublicError('Image questions must not contain more than 10 characters. Consider shortening this question or changing the QUESTION TYPE to TEXT.', lineIndex, uri);
      } else if (question.length > 300) {
        throwParsePublicError('Questions must not contain more than 300 characters.', lineIndex, uri);
      } else if (answers.length > 300) {
        throwParsePublicError('Answers must not contain more than 300 characters', lineIndex, uri);
      } else if (meaning && meaning.length > 300) {
        throwParsePublicError('Meaning must not contain more than 300 characters', lineIndex, uri);
      }

      const card = {
        question,
        answer: answers.split('/').filter(a => a),
      };

      if (meaning) {
        card.meaning = meaning.split('/').join(', ');
      }

      cards.push(card);
    }
  }

  if (cards.length === 0) {
    throwParsePublicError('No questions', 0, uri);
  }

  const deck = {
    isInternetDeck: true,
    name: deckName,
    shortName,
    article: 'a',
    instructions,
    questionCreationStrategy,
    dictionaryLinkStrategy: 'NONE',
    answerTimeLimitStrategy: 'JAPANESE_SETTINGS',
    cardPreprocessingStrategy: 'NONE',
    discordFinalAnswerListElementStrategy: 'QUESTION_AND_ANSWER_LINK_QUESTION',
    scoreAnswerStrategy: 'ONE_ANSWER_ONE_POINT',
    additionalAnswerWaitStrategy: 'JAPANESE_SETTINGS',
    discordIntermediateAnswerListElementStrategy: 'CORRECT_ANSWERS',
    answerCompareStrategy: 'CONVERT_KANA',
    commentFieldName: 'Meaning',
    cards: createCardGetterFromInMemoryArray(cards),
  };

  validateDeckPropertiesValid(deck);
  return deck;
}

async function tryFetchRawFromPastebin(pastebinUri) {
  /* Uncomment for testing
  return `FULL NAME: n
SHORT NAME: n
INSTRUCTIONS: fgrg
--QuestionsStart--
犬,f,
1日,いちにち/ついたち,first of the month/one day
太陽,たいよう`; */
  return request({
    uri: pastebinUri,
    json: false,
    timeout: 10000,
  }).catch((err) => {
    throw PublicError.createWithCustomPublicMessage('There was an error downloading the deck from that URI. Check that the URI is correct and try again.', false, 'Pastebin fetch error', err);
  });
}

function countRowsForUserId(data, userId) {
  const keys = Object.keys(data.communityDecks);
  const total = keys.reduce((sum, key) => {
    if (data.communityDecks[key].authorId === userId) {
      return sum + 1;
    }
    return sum;
  }, 0);
  return total / 3;
}

async function getDeckFromInternet(deckInformation, invokerUserId, invokerUserName) {
  let deckUri;

  // If the deck name is a pastebin URI, extract the good stuff.
  const pastebinRegexResults = PASTEBIN_REGEX.exec(deckInformation.deckNameOrUniqueId);
  if (pastebinRegexResults) {
    const pastebinCode = pastebinRegexResults[1];
    deckUri = `http://pastebin.com/raw/${pastebinCode}`;
  }

  // Check for a matching database entry and use the URI from there if there is one.
  const databaseData = await globals.persistence.getGlobalData();
  let foundInDatabase = false;
  let uniqueId;
  let author;
  if (databaseData.communityDecks) {
    const foundDatabaseEntry = databaseData.communityDecks[deckInformation.deckNameOrUniqueId]
      || databaseData.communityDecks[deckUri];

    if (foundDatabaseEntry) {
      foundInDatabase = true;
      deckUri = foundDatabaseEntry.uri;
      ({ uniqueId } = foundDatabaseEntry);
      author = foundDatabaseEntry.authorName;
    } else {
      throwPublicErrorInfo('Quiz', 'Please visit [the web dashboard](http://kotobaweb.com/dashboard) to create custom quizzes.', 'trying to load new deck from pastebin');
    }
  } else if (deckUri) {
    throwPublicErrorInfo('Quiz', 'Please visit [the web dashboard](http://kotobaweb.com/dashboard) to create custom quizzes.', 'trying to load new deck from pastebin');
  }

  // If the given deck name is not a pastebin URI, and we didn't
  // find one in the database, the deck is unfound. Return undefined.
  if (!deckUri) {
    return undefined;
  }

  // Try to create the deck from pastebin.
  const pastebinData = await tryFetchRawFromPastebin(deckUri);
  let deck = tryCreateDeckFromRawData(pastebinData, deckUri);
  deck = shallowCopyDeckAndAddModifiers(deck, deckInformation);

  // If the deck was found in the database, update its field from database values.
  // If it wasn't, add the appropriate entries to the database for next time.
  if (foundInDatabase) {
    deck.uniqueId = uniqueId;
    deck.author = author;
  } else if (invokerUserId && invokerUserName) {
    await globals.persistence.editGlobalData((data) => {
      if (!data.communityDecks) {
        // eslint-disable-next-line no-param-reassign
        data.communityDecks = {};
      }
      if (countRowsForUserId(data, invokerUserId) >= MAX_DECKS_PER_USER) {
        throwParsePublicError(`You have already added the maximum of ${MAX_DECKS_PER_USER} decks. You can delete existing decks with **k!quiz delete deckname**.`, 0, deckUri);
      }
      if (data.communityDecks[deck.shortName]) {
        throwParsePublicError('There is already a deck with that SHORT NAME. Please choose another SHORT NAME and make a new paste.', 0, deckUri);
      }
      uniqueId = Date.now().toString();
      const databaseEntry = {
        uri: deckUri, authorId: invokerUserId, authorName: invokerUserName, uniqueId,
      };
      // eslint-disable-next-line no-param-reassign
      data.communityDecks[deckUri] = databaseEntry;
      // eslint-disable-next-line no-param-reassign
      data.communityDecks[uniqueId] = databaseEntry;
      // eslint-disable-next-line no-param-reassign
      data.communityDecks[deck.shortName] = databaseEntry;
      deck.uniqueId = uniqueId;
      deck.author = invokerUserName;
      return data;
    });
  }

  deck.description = '[User submitted deck loaded remotely from Pastebin]';

  return deck;
}

async function deleteInternetDeck(searchTerm, deletingUserId) {
  let returnStatus;

  await globals.persistence.editGlobalData((data) => {
    data.communityDecks = data.communityDecks || {};
    const foundRow = data.communityDecks[searchTerm];
    if (!foundRow) {
      returnStatus = DeletionStatus.DECK_NOT_FOUND;
    } else if (foundRow.authorId !== deletingUserId) {
      returnStatus = DeletionStatus.USER_NOT_OWNER;
    } else {
      const { uniqueId } = foundRow;
      const communityDeckKeys = Object.keys(data.communityDecks);

      communityDeckKeys.forEach((key) => {
        if (data.communityDecks[key].uniqueId === uniqueId) {
          // eslint-disable-next-line no-param-reassign
          delete data.communityDecks[key];
        }
      });

      returnStatus = DeletionStatus.DELETED;
    }
    return data;
  });

  return returnStatus;
}

class OutOfBoundsCardRangeStatus {
  constructor(deck) {
    this.status = DeckRequestStatus.INDEX_OUT_OF_RANGE;
    this.deckName = deck.name;
    this.allowedStart = 1;
    this.allowedEnd = deck.cards.length;
  }
}

function createOutOfBoundsCardRangeStatus(decks) {
  for (let i = 0; i < decks.length; i += 1) {
    const deck = decks[i];

    if (deck.startIndex !== undefined || deck.endIndex !== undefined) {
      if (deck.startIndex < 1
        || deck.endIndex > deck.cards.length
        || deck.startIndex > deck.endIndex) {
        return new OutOfBoundsCardRangeStatus(deck);
      }
    }
  }

  return undefined;
}

async function getCustomDeckFromDisk(deckInfo) {
  const deckPath = path.join(CUSTOM_DECK_DIR, `${deckInfo.deckNameOrUniqueId.toLowerCase()}.json`);

  return new Promise((fulfill, reject) => {
    fs.readFile(deckPath, 'utf8', (err, deckText) => {
      if (err) {
        return fulfill(undefined);
      }

      const deckRaw = JSON.parse(deckText);

      const cards = deckRaw.cards.map(card => ({
        question: card.question,
        answer: card.answers,
        meaning: card.comment,
        questionCreationStrategy: card.questionCreationStrategy,
      }));

      const deck = {
        isInternetDeck: true,
        name: deckRaw.name,
        shortName: deckRaw.shortName,
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

      fulfill(deck);
    });
  });
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
    });
  }).filter(x => x);

  await Promise.all(customDeckPromises);

  // For any decks not found in memory or as custom decks on disk, try to get from internet.
  const promises = [];
  for (let i = 0; i < decks.length; i += 1) {
    const deck = decks[i];
    if (!deck) {
      const internetDeckPromise = getDeckFromInternet(
        deckInfos[i],
        invokerUserId,
        invokerUserName,
      ).then((internetDeck) => {
        decks[i] = internetDeck;
      });

      promises.push(internetDeckPromise);
    }
  }

  await Promise.all(promises);

  // If not all decks were found, return error.
  for (let i = 0; i < decks.length; i += 1) {
    const deck = decks[i];
    if (!deck) {
      return createDeckNotFoundStatus(deckInfos[i].deckNameOrUniqueId);
    }
  }

  const outOfBoundsStatus = createOutOfBoundsCardRangeStatus(decks);
  if (outOfBoundsStatus) {
    return outOfBoundsStatus;
  }

  // If all decks were found return success.
  return createAllDecksFoundStatus(decks);
}

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function createReviewDeck(unansweredCards) {
  return {
    uniqueId: 'REVIEW',
    name: 'Review Quiz',
    article: 'a',
    requiresAudioConnection: unansweredCards.some(card => card.requiresAudioConnection),
    isInternetDeck: unansweredCards.some(card => card.isInternetCard),
    cards: createCardGetterFromInMemoryArray(deepCopy(unansweredCards)),
  };
}

module.exports = {
  getQuizDecks,
  DeckRequestStatus,
  deleteInternetDeck,
  DeletionStatus,
  createReviewDeck,
  loadDecks,
};
