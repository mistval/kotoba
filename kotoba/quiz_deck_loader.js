'use strict'
const reload = require('require-reload')(require);
const logger = reload('monochrome-bot').logger;
const state = require('./static_state.js');
const fs = require('fs');
const assert = require('assert');
const cardStrategies = reload('./quiz_card_strategies.js');
const persistence = reload('monochrome-bot').persistence;
const request = require('request-promise');
const PublicError = reload('monochrome-bot').PublicError;

const LOGGER_TITLE = 'QUIZ DECK LOADER';
const DECKS_DIRECTORY = `${__dirname}/carddecks`;
const PASTEBIN_REGEX = /pastebin\.com\/(?:raw\/)?(.*)/;
const QUESTIONS_START_IDENTIFIER = '--QuestionsStart--';
const MAX_DECKS_PER_USER = 10;

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

function validateDeckPropertiesValid(deck) {
  assert(deck.name, 'No name.');
  assert(deck.article, 'No article.');
  assert(deck.instructions, 'No instructions.');
  assert(deck.cards, 'No cards.');
  assert(deck.commentFieldName, 'No comment field name');
  assert(~Object.keys(cardStrategies.CreateQuestionStrategy).indexOf(deck.questionCreationStrategy), 'No or invalid question creation strategy.');
  assert(~Object.keys(cardStrategies.CreateDictionaryLinkStrategy).indexOf(deck.dictionaryLinkStrategy), 'No or invalid dictionary link strategy.');
  assert(~Object.keys(cardStrategies.AnswerTimeLimitStrategy).indexOf(deck.answerTimeLimitStrategy), 'No or invalid answer time limit strategy.');
  assert(~Object.keys(cardStrategies.CardPreprocessingStrategy).indexOf(deck.cardPreprocessingStrategy), 'No or invalid preprocessing strategy.');
  assert(~Object.keys(cardStrategies.ScoreAnswerStrategy).indexOf(deck.scoreAnswerStrategy), 'No or invalid score answer strategy.');
  assert(~Object.keys(cardStrategies.AdditionalAnswerWaitStrategy).indexOf(deck.additionalAnswerWaitStrategy), 'No or invalid additional answer wait strategy.');
  assert(~Object.keys(cardStrategies.AnswerCompareStrategy).indexOf(deck.answerCompareStrategy), 'No or invalid answerCompareStrategy.');
}

function loadDecksFromDisk() {
  let files = fs.readdir(DECKS_DIRECTORY, (err, files) => {
    if (err) {
      return logger.logFailure(LOGGER_TITLE, 'Error reading files in quiz decks directory', err);
    }
    try {
      for (let name of files) {
        if (name.endsWith('.json')) {
          let deckFilePath = `${DECKS_DIRECTORY}/${name}`;
          fs.readFile(deckFilePath, (err, data) => {
            if (err) {
              return logger.logFailure(LOGGER_TITLE, `Error loading quiz deck ${name}`, err);
            }
            try {
              let deckData = JSON.parse(data);
              validateDeckPropertiesValid(deckData);
              let deckFileBaseName = name.replace(/\.json$/, '');
              state.quizDecksLoader.quizDeckForName[deckFileBaseName.toLowerCase()] = deckData;
              if (!deckData.uniqueId || state.quizDecksLoader.quizDeckForUniqueId[deckData.uniqueId]) {
                throw new Error(`Deck ${name} does not have a unique uniqueId, or doesn't have one at all.`);
              }
              state.quizDecksLoader.quizDeckForUniqueId[deckData.uniqueId] = deckData;
            } catch (err) {
              logger.logFailure(LOGGER_TITLE, `Error loading deck ${name}`, err);
            }
          });
        }
      }
    } catch (err) {
      logger.logFailure(LOGGER_TITLE, 'Unexpected error loading quiz decks', err);
    }
  });
}

function getObjectValues(obj) {
  return Object.keys(obj).map(key => obj[key]);
}

function createAllDecksFoundStatus(decks) {
  return {
    status: DeckRequestStatus.ALL_DECKS_FOUND,
    decks: decks,
  };
}

function createDeckNotFoundStatus(missingDeckName) {
  return {
    status: DeckRequestStatus.DECK_NOT_FOUND,
    notFoundDeckName: missingDeckName,
  };
}

function shallowCopyDeckAndAddModifiers(deck, deckInformation) {
  deck = Object.assign({}, deck);
  deck.startIndex = deckInformation.startIndex;
  deck.endIndex = deckInformation.endIndex;

  if (typeof deckInformation.numberOfOptions === typeof 1) {
    deck.numberOfOptions = deckInformation.numberOfOptions;
  } else {
    deck.numberOfOptions = 0;
  }

  return deck;
}

function getDeckFromMemory(deckInformation) {
  let deck = state.quizDecksLoader.quizDeckForName[deckInformation.deckNameOrUniqueId] || state.quizDecksLoader.quizDeckForUniqueId[deckInformation.deckNameOrUniqueId];
  if (deck) {
    deck.isInternetDeck = false;
    deck = shallowCopyDeckAndAddModifiers(deck, deckInformation);
  }
  return deck;
}

function throwParsePublicError(errorReason, lineIndex, uri) {
  throw PublicError.createWithCustomPublicMessage(`Error parsing deck data at <${uri}> line ${lineIndex + 1}: ${errorReason}`, false, 'Community deck validation error');
}

function tryCreateDeckFromRawData(data, uri) {
  // data = data.replace(/\r\n/g, '\n'); // Uncomment for testing with embedded data.
  let lines = data.split('\r\n');
  let lineIndex = 0;

  // Parse and validate header
  let deckName;
  let instructions;
  let shortName;
  let questionCreationStrategy;
  for (; lineIndex < lines.length && !lines[lineIndex].startsWith(QUESTIONS_START_IDENTIFIER); ++lineIndex) {
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
      } else if (~shortName.indexOf('+')) {
        throwParsePublicError('SHORT NAME must not contain a + symbol.', lineIndex, uri);
      } else if (~shortName.indexOf(' ')) {
        throwParsePublicError('SHORT NAME must not contain any spaces.', lineIndex, uri);
      }
    } else if (lines[lineIndex].startsWith('QUESTION TYPE:')) {
      let questionType = lines[lineIndex].replace('QUESTION TYPE:', '').trim().toUpperCase();
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
  }

  if (!questionCreationStrategy) {
    questionCreationStrategy = 'IMAGE'
  }

  // Parse and validate questions
  let cards = [];
  ++lineIndex;
  for (; lineIndex < lines.length; ++lineIndex) {
    if (!lines[lineIndex]) {
      continue;
    }
    let parts = lines[lineIndex].split(',');
    let question = parts[0];
    let answers = parts[1];
    let meaning = parts[2];

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

    let card = {
      question: question,
      answer: answers.split('/'),
    };

    if (meaning) {
      card.meaning = meaning.split('/').join(', ');
    }

    cards.push(card);
  }

  if (cards.length === 0) {
    throwParsePublicError('No questions', 0, uri);
  }

  let deck = {
    "isInternetDeck": true,
    "name": deckName,
    "shortName": shortName,
    "article": "a",
    "instructions": instructions,
    "questionCreationStrategy": questionCreationStrategy,
    "dictionaryLinkStrategy": "NONE",
    "answerTimeLimitStrategy": "JAPANESE_SETTINGS",
    "cardPreprocessingStrategy": "NONE",
    "discordFinalAnswerListElementStrategy": "QUESTION_AND_ANSWER_LINK_QUESTION",
    "scoreAnswerStrategy": "ONE_ANSWER_ONE_POINT",
    "additionalAnswerWaitStrategy": "JAPANESE_SETTINGS",
    "discordIntermediateAnswerListElementStrategy": "CORRECT_ANSWERS",
    "answerCompareStrategy": "CONVERT_KANA",
    "compileImages": false,
    "commentFieldName": "Meaning",
    "cards": cards,
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
  }).catch(err => {
    throw PublicError.createWithCustomPublicMessage('There was an error downloading the deck from that URI. Check that the URI is correct and try again.', false, 'Pastebin fetch error', err);
  });
}

function countRowsForUserId(data, userId) {
  let keys = Object.keys(data.communityDecks);
  let total = keys.reduce((sum, key) => {
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
  let pastebinRegexResults = PASTEBIN_REGEX.exec(deckInformation.deckNameOrUniqueId);
  if (pastebinRegexResults) {
    let pastebinCode = pastebinRegexResults[1];
    deckUri = `http://pastebin.com/raw/${pastebinCode}`;
  }

  // Check for a matching database entry and use the URI from there if there is one.
  let databaseData = await persistence.getGlobalData();
  let foundInDatabase = false;
  let uniqueId;
  let author;
  if (databaseData.communityDecks) {
    let foundDatabaseEntry = databaseData.communityDecks[deckInformation.deckNameOrUniqueId] || databaseData.communityDecks[deckUri];
    if (foundDatabaseEntry) {
      foundInDatabase = true;
      deckUri = foundDatabaseEntry.uri;
      uniqueId = foundDatabaseEntry.uniqueId;
      author = foundDatabaseEntry.authorName;
    }
  }

  // If the given deck name is not a pastebin URI, and we didn't
  // find one in the database, the deck is unfound. Return undefined.
  if (!deckUri) {
    return;
  }

  // Try to create the deck from pastebin.
  let pastebinData = await tryFetchRawFromPastebin(deckUri);
  let deck = tryCreateDeckFromRawData(pastebinData, deckUri);
  deck = shallowCopyDeckAndAddModifiers(deck, deckInformation);

  // If the deck was found in the database, update its field from database values.
  // If it wasn't, add the appropriate entries to the database for next time.
  if (foundInDatabase) {
    deck.uniqueId = uniqueId;
    deck.author = author;
  } else if (invokerUserId && invokerUserName) {
    await persistence.editGlobalData(data => {
      if (!data.communityDecks) {
        data.communityDecks = {};
      }
      if (countRowsForUserId(data, invokerUserId) >= MAX_DECKS_PER_USER) {
        throwParsePublicError(`You have already added the maximum of ${MAX_DECKS_PER_USER} decks. You can delete existing decks with **k!quiz delete deckname**.`, 0, deckUri);
      }
      if (data.communityDecks[deck.shortName]) {
        throwParsePublicError('There is already a deck with that SHORT NAME. Please choose another SHORT NAME and make a new paste.', 0, deckUri);
      }
      let uniqueId = Date.now().toString();
      let databaseEntry = {uri: deckUri, authorId: invokerUserId, authorName: invokerUserName, uniqueId: uniqueId};
      data.communityDecks[deckUri] = databaseEntry;
      data.communityDecks[uniqueId] = databaseEntry;
      data.communityDecks[deck.shortName] = databaseEntry;
      deck.uniqueId = uniqueId;
      deck.author = invokerUserName;
      return data;
    });
  }

  return deck;
}

async function deleteInternetDeck(searchTerm, deletingUserId) {
  let returnStatus;

  await persistence.editGlobalData(data => {
    let foundRow = data.communityDecks[searchTerm];
    if (!foundRow) {
      returnStatus = DeletionStatus.DECK_NOT_FOUND;
    } else if (foundRow.authorId !== deletingUserId) {
      returnStatus = DeletionStatus.USER_NOT_OWNER;
    } else {
      let uniqueId = foundRow.uniqueId;
      let communityDeckKeys = Object.keys(data.communityDecks);
      for (let key of communityDeckKeys) {
        if (data.communityDecks[key].uniqueId === uniqueId) {
          delete data.communityDecks[key];
        }
      }
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
    this.allowedStart = 0;
    this.allowedEnd = deck.cards.length;
  }
}

function createOutOfBoundsCardRangeStatus(decks) {
  for (let deck of decks) {
    if (deck.startIndex === undefined && deck.endIndex === undefined) {
      continue;
    }
    if (deck.startIndex < 0 || deck.endIndex > deck.cards.length || deck.startIndex > deck.endIndex) {
      return new OutOfBoundsCardRangeStatus(deck);
    }
  }
}

async function getQuizDecks(deckInfos, invokerUserId, invokerUserName) {
  let decks = [];

  // Try to get decks from memory.
  for (let deckInfo of deckInfos) {
    decks.push(getDeckFromMemory(deckInfo));
  }

  // For any decks not found in memory, try to get from internet.
  let promises = [];
  for (let i = 0; i < decks.length; ++i) {
    let deck = decks[i];
    if (!deck) {
      promises.push(getDeckFromInternet(deckInfos[i], invokerUserId, invokerUserName).then(internetDeck => {
        decks[i] = internetDeck;
      }));
    }
  }

  await Promise.all(promises);

  // If not all decks were found, return error.
  for (let i = 0; i < decks.length; ++i) {
    let deck = decks[i];
    if (!deck) {
      return createDeckNotFoundStatus(deckInfos[i].deckNameOrUniqueId);
    }
  }

  let outOfBoundsStatus = createOutOfBoundsCardRangeStatus(decks);
  if (outOfBoundsStatus) {
    return outOfBoundsStatus;
  }

  // If all decks were found return success.
  return createAllDecksFoundStatus(decks);
}

if (!state.quizDecksLoader) {
  state.quizDecksLoader = {
    quizDeckForName: {},
    quizDeckForUniqueId: {},
  };
  loadDecksFromDisk();
}

module.exports.getQuizDecks = getQuizDecks;
module.exports.DeckRequestStatus = DeckRequestStatus;
module.exports.deleteInternetDeck = deleteInternetDeck;
module.exports.DeletionStatus = DeletionStatus;
