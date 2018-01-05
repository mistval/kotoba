'use strict'
const reload = require('require-reload')(require);
const state = require('./static_state.js');
const fs = require('fs');
const renderText = reload('./render_text.js').render;
const logger = reload('monochrome-bot').logger;
const ScoreStorageUtils = reload('./quiz_score_storage_utils.js');
const assert = require('assert');
const Util = reload('./utils.js');

const LOGGER_TITLE = 'QUIZ';

let BetterEnglishDefinitions;
try {
  BetterEnglishDefinitions = reload('./BetterEnglishDefinitions.js');
} catch (err) {
  logger.logFailure(LOGGER_TITLE, 'Couldn\'t load better English definitions. The crappy definitions will be used. The better definitions are not available in the public repo (for legitimate reasons I might add!)');
}

const INITIAL_DELAY_IN_MS = 5000;

const DEFAULT_WITH_HINT_TIME_LIMIT_IN_MS = 25000;
const REVEAL_INTERVAL_IN_MS = 8000;
const NUMBER_OF_REVEALS_PER_CARD = 2;
const FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL = .25;
const ADDITIONAL_ANSWER_WAIT_TIME_FOR_MULTIPLE_ANSWERS = 10000;

/* DICTIONARY LINK STRATEGIES */

const CreateDictionaryLinkStrategy = {
  JISHO_QUESTION_WORD: card => {return 'http://jisho.org/search/' + encodeURIComponent(card.question)},
  JISHO_QUESTION_KANJI: card => {return `http://jisho.org/search/${encodeURIComponent(card.question)}%23kanji`},
  JISHO_ANSWER_WORD: card => {return 'http://jisho.org/search/' + encodeURIComponent(card.answer[0])},
  WEBSTER_ANSWER: card => {return 'https://www.merriam-webster.com/dictionary/' + encodeURIComponent(card.answer[0])},
  WEBSTER_QUESTION: card => {return 'https://www.merriam-webster.com/dictionary/' + encodeURIComponent(card.question)},
  NONE: card => {},
};

const CreateAggregateDictionaryLinkStrategy = {
  JISHO_QUESTION_WORD: cards => {return `http://jisho.org/search/${encodeURIComponent(cards.map(card => card.question).join(','))}`},
  JISHO_QUESTION_KANJI: cards => {return `http://jisho.org/search/${encodeURIComponent(cards.map(card => card.question).join(','))}%23kanji`},
  JISHO_ANSWER_WORD: cards => {return `http://jisho.org/search/${encodeURIComponent(cards.map(card => card.answer[0]).join(','))}`},
  WEBSTER_ANSWER: cards => {},
  WEBSTER_QUESTION: card => {},
  NONE: cards => {},
};

/* SCORES */

class Scores {
  constructor(scoreLimit, deckId, scoreScopeId) {
    this.questionScores_ = [];
    this.scoreLimit_ = scoreLimit;
    this.scoreScopeId_ = scoreScopeId;
    this.deckId_ = deckId;
  }

  commitScores() {
    ScoreStorageUtils.addScores(this.scoreScopeId_, this.deckId_, this.getRoundedScoresForLb_(), this.nameForUserId_);
  }

  addQuestionScores(questionScores) {
    this.questionScores_.push(questionScores);
  }

  checkForWin() {
    this.updateTotals_();
    return Object.keys(this.scoreForUserId_).some(key => this.scoreForUserId_[key].normalizedScore >= this.scoreLimit_);
  }

  getScoreForUserPairs() {
    this.updateTotals_();
    return Object.keys(this.scoreForUserId_).map(key => {
      let userId = key;
      let normalizedScore = this.scoreForUserId_[userId].normalizedScore;
      let totalScore = this.scoreForUserId_[userId].totalScore;
      return {userId: key, totalScore: totalScore, normalizedScore: normalizedScore};
    }).sort((a, b) => {
      return b.normalizedScore - a.normalizedScore;
    });
  }

  getScoreForUserId() {
    this.updateTotals_();
    return this.scoreForUserId_;
  }

  getScoreLimit() {
    return this.scoreLimit_;
  }

  updateTotals_() {
    this.scoreForUserId_ = {};
    this.nameForUserId_ = {};
    for (let questionScores of this.questionScores_) {
      let questionNormalizedScoreForUserId = questionScores.getNormalizedScoreForUserIds();
      let questionNonNormalizedScoreForUserId = questionScores.getNonNormalizedScoreForUserIds();
      let questionNameForUserId = questionScores.getNameForUserIds();

      for (let userId of Object.keys(questionNormalizedScoreForUserId)) {
        this.nameForUserId_[userId] = questionNameForUserId[userId];
        if (!this.scoreForUserId_[userId]) {
          this.scoreForUserId_[userId] = {
            totalScore: 0,
            normalizedScore: 0,
          };
        }
        this.scoreForUserId_[userId].totalScore += questionNonNormalizedScoreForUserId[userId];
        this.scoreForUserId_[userId].normalizedScore += questionNormalizedScoreForUserId[userId];
      }
    }

    for (let userId of Object.keys(this.scoreForUserId_)) {
      let score = this.scoreForUserId_[userId];
      score.normalizedScore = Math.floor(score.normalizedScore);
    }
  }

  getRoundedScoresForLb_() {
    this.updateTotals_();
    return Util.mapObjectValue(this.scoreForUserId_, score => score.normalizedScore);
  }
}

class QuestionScores {
  constructor() {
    this.answersForUserId_ = {};
    this.pointsPerAnswerForUserId_ = {};
    this.nameForUserId_ = {};
    this.answerersInOrder_ = [];
    this.allAnswers_ = {};
  }

  getAnswersForUser() {
    return this.answersForUserId_;
  }

  getPointsPerAnswerForUser() {
    return this.pointsPerAnswerForUserId_;
  }

  getNonNormalizedScoreForUserIds() {
    return Util.mapObjectKey(this.pointsPerAnswerForUserId_, key => {
      return this.getTotalScoreForUserId_(key);
    });
  }

  getNormalizedScoreForUserIds() {
    let maxScore = 0;
    let userIds = Object.keys(this.answersForUserId_);
    for (let userId of userIds) {
      let score = this.getTotalScoreForUserId_(userId);
      maxScore = Math.max(maxScore, score);
    }

    let normalizedScoreForUserId = {};
    for (let userId of userIds) {
      normalizedScoreForUserId[userId] = this.getTotalScoreForUserId_(userId) / maxScore;
    }

    return normalizedScoreForUserId;
  }

  getAnswerersInOrder() {
    return this.answerersInOrder_;
  }

  getNameForUserIds() {
    return this.nameForUserId_;
  }

  // Precondition: The user provided a correct answer.
  // Postcondition: If that answer should be awarded points,
  //   they are awarded.
  // Returns true if points are awarded, false otherwise.
  submitAnswer(userId, userName, answer, points, scoreDifferentAnswers) {
    if (scoreDifferentAnswers && this.allAnswers_[answer]) {
      return false;
    } else if (this.answersForUserId_[userId] && ~this.answersForUserId_[userId].indexOf(answer)) {
      return false;
    }

    if (!scoreDifferentAnswers && this.answersForUserId_[userId]) {
      return false;
    }

    this.allAnswers_[answer] = true;
    this.nameForUserId_[userId] = userName;
    if (!this.answersForUserId_[userId]) {
      this.answersForUserId_[userId] = [];
      this.pointsPerAnswerForUserId_[userId] = [];
    }

    this.answersForUserId_[userId].push(answer);
    this.pointsPerAnswerForUserId_[userId].push(points);

    if (!~this.answerersInOrder_.indexOf(userId)) {
      this.answerersInOrder_.push(userId);
    }
    return true;
  }

  getTotalScoreForUserId_(userId) {
    return this.pointsPerAnswerForUserId_[userId].reduce((sum, points) => sum + points, 0);
  }
}

/* SCORING STRATEGIES */

function scoreOneAnswerOnePoint(userId, userName, answer, card, questionScores) {
  let correctAnswer = ~card.answer.indexOf(answer);
  if (!correctAnswer) {
    return false;
  }
  return questionScores.submitAnswer(userId, userName, answer, 1, false);
}

function scoreMultipleAnswersPositionPoints(userId, userName, answer, card, questionScores) {
  let answerIndex = card.answer.indexOf(answer);
  let correctAnswer = answerIndex !== -1;
  if (!correctAnswer) {
    return false;
  }
  let points = 1;
  if (card.pointsForAnswer) {
    points = card.pointsForAnswer[answerIndex];
  }
  return questionScores.submitAnswer(userId, userName, answer, points, true);
}

const ScoreAnswerStrategy = {
  ONE_ANSWER_ONE_POINT: scoreOneAnswerOnePoint,
  MULTIPLE_ANSWERS_POSITION_POINTS: scoreMultipleAnswersPositionPoints,
};

/* QUESTION CREATION STRATEGIES */

function createQuestionCommon(card) {
  return {
    deckName: card.deckName,
    instructions: card.instructions,
  };
}

function createImageQuestion(card) {
  let question = createQuestionCommon(card);
  return renderText(card.question).then(pngBuffer => {
    question.bodyAsPngBuffer = pngBuffer;
    return question;
  });
}

function createTextQuestionWithHint(card, quizState) {
  if (!quizState.textQuestionWithHintStrategyState) {
    quizState.textQuestionWithHintStrategyState = {};
  }
  if (quizState.textQuestionWithHintStrategyState.cardId !== card.id) {
    quizState.textQuestionWithHintStrategyState.cardId = card.id;
    let totalNumberOfCharactersToReveal = Math.ceil(card.answer[0].length * NUMBER_OF_REVEALS_PER_CARD * FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL);

    // Randomize which indices to reveal in which order
    let allCharacterIndices = [];
    for (let i = 0; i < card.answer[0].length; ++i) {
      allCharacterIndices.push(i);
    }
    let shuffledIndices = Util.shuffleArray(allCharacterIndices);
    let revealIndexQueue = shuffledIndices.slice(0, totalNumberOfCharactersToReveal);
    let revelationState = Array(card.answer[0].length + 1).join('_');
    quizState.textQuestionWithHintStrategyState.revealIndexQueue = revealIndexQueue;
    quizState.textQuestionWithHintStrategyState.revelationState = revelationState;
  } else {
    let numberOfIndicesToReveal = Math.ceil(FRACTION_OF_WORD_TO_REVEAL_PER_REVEAL * card.answer[0].length);
    let revealIndexQueue = quizState.textQuestionWithHintStrategyState.revealIndexQueue;
    let revelationStateArray = quizState.textQuestionWithHintStrategyState.revelationState.split('');
    for (let i = 0; i < numberOfIndicesToReveal && revealIndexQueue.length > 0; ++i) {
      let indexToReveal = revealIndexQueue.pop();
      revelationStateArray[indexToReveal] = card.answer[0][indexToReveal];
    }
    quizState.textQuestionWithHintStrategyState.revelationState = revelationStateArray.join('');
  }

  let revelationString = quizState.textQuestionWithHintStrategyState.revelationState.split('').join(' ');
  let question = createQuestionCommon(card);
  question.bodyAsText = card.question;
  question.hintString = revelationString;
  return Promise.resolve(question);
}

const CreateQuestionStrategy = {
  IMAGE: createImageQuestion,
  TEXT_WITH_HINT: createTextQuestionWithHint,
};

/* CARD PREPROCESSING STRATEGIES */

function updateWithBetterEnglishDefinition(card) {
  if (!BetterEnglishDefinitions) {
    return Promise.resolve(card);
  }
  return BetterEnglishDefinitions.getDefinition(card.answer[0]).then(result => {
    card.question = result.question;
    card.answer = [result.answer];
    return card;
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Failed to get better English definitions for: ' + card.answer[0]);
    return false;
  });
}

function randomizeQuestionCharacters(card) {
  let loopCounter = 0;
  let newQuestion = Util.shuffleArray(card.question.split('')).join('');

  // If the new question is the same as the original one, swap one random character with one other.
  if (newQuestion === card.question) {
    let newQuestionCharArray = newQuestion.split('');
    let randomIndex1 = Math.floor(Math.random() * newQuestionCharArray.length);
    let randomIndex2 = Math.floor(Math.random() * (newQuestionCharArray.length - 1));
    if (randomIndex2 >= randomIndex1) {
      ++randomIndex2;
    }
    let temp = newQuestionCharArray[randomIndex1];
    newQuestionCharArray[randomIndex1] = newQuestionCharArray[randomIndex2];
    newQuestionCharArray[randomIndex2] = temp;
    newQuestion = newQuestionCharArray.join('');
  }

  card.question = newQuestion;
  return Promise.resolve(card);
}

const CardPreprocessingStrategy = {
  BETTER_ENGLISH_DEFINITIONS: updateWithBetterEnglishDefinition,
  RANDOMIZE_QUESTION_CHARACTERS: randomizeQuestionCharacters,
  NONE: card => Promise.resolve(card),
};

/* TIMING STRATEGIES */

const AnswerTimeLimitStrategy = {
  JAPANESE_SETTINGS: settings => {return settings.timeoutOverrideInMs || settings.serverQuizSettings['quiz/japanese/answer_time_limit'] * 1000;},
  WITH_HINT: settings => {return settings.timeoutOverrideInMs || DEFAULT_WITH_HINT_TIME_LIMIT_IN_MS;},
};

const AdditionalAnswerWaitStrategy = {
  JAPANESE_SETTINGS: settings => {return settings.additionalAnswerWaitTimeInMs},
  MULTIPLE_ANSWERS: settings => {return ADDITIONAL_ANSWER_WAIT_TIME_FOR_MULTIPLE_ANSWERS;}
};

const RevealsLeftStrategy = {
  JAPANESE_SETTINGS: () => 0,
  WITH_HINT: () => 2,
}

/* LOADING AND INITIALIZATION */

function validateDeckPropertiesValid(deck) {
  assert(deck.name, 'No name.');
  assert(deck.article, 'No article.');
  assert(deck.instructions, 'No instructions.');
  assert(deck.cards, 'No cards.');
  assert(~Object.keys(CreateQuestionStrategy).indexOf(deck.questionCreationStrategy), 'No or invalid question creation strategy.');
  assert(~Object.keys(CreateDictionaryLinkStrategy).indexOf(deck.dictionaryLinkStrategy), 'No or invalid dictionary link strategy.');
  assert(~Object.keys(AnswerTimeLimitStrategy).indexOf(deck.answerTimeLimitStrategy), 'No or invalid answer time limit strategy.');
  assert(~Object.keys(CardPreprocessingStrategy).indexOf(deck.cardPreprocessingStrategy), 'No or invalid preprocessing strategy.');
  assert(~Object.keys(ScoreAnswerStrategy).indexOf(deck.scoreAnswerStrategy), 'No or invalid score answer strategy.');
  assert(~Object.keys(AdditionalAnswerWaitStrategy).indexOf(deck.additionalAnswerWaitStrategy), 'No or invalid additional answer wait strategy.');
  assert(deck.discordIntermediateAnswerListElementStrategy, 'No or invalid Discord answer list intermediate element strategy.');
  assert(deck.discordFinalAnswerListElementStrategy, 'No or invalid Discord answer list final element strategy.');
}

if (!state.quizManager) {
  state.quizManager = {
    deckForName: {},
    currentActionForSessionId: {},
    stateInformationForSessionId: {},
    reviewDeckForSessionId: {},
  };
}

function getObjectValues(obj) {
  return Object.keys(obj).map(key => obj[key]);
}

function loadDecksInDirectory(dictionaryToFill, directory, strategy) {
  let files = fs.readdirSync(__dirname + directory);
  for (let name of files) {
    if (name.endsWith('.json')) {
      try {
        let baseName = name.replace(/\.json$/, '');
        let deckData = reload('.' + directory + name);
        validateDeckPropertiesValid(deckData);
        dictionaryToFill[baseName.toLowerCase()] = deckData;
      } catch (err) {
        logger.logFailure(LOGGER_TITLE, 'Error loading deck ' + name, err);
      }
    }
  }
}

function verifyUniqueIdsUnique(decks) {
  let uniqueIds = {};
  for (let deck of decks) {
    if (!deck.uniqueId || uniqueIds[deck.uniqueId]) {
      throw new Error('A deck does not have a unique unique id. Deck name: ' + deck.name);
    }
  }
}

loadDecksInDirectory(state.quizManager.deckForName, '/carddecks/japanese/');
loadDecksInDirectory(state.quizManager.deckForName, '/carddecks/english/');
verifyUniqueIdsUnique(getObjectValues(state.quizManager.deckForName));

/* DECK MANAGEMENT HELPERS */

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function createRandomIndexSetForDecks(decks) {
  let indexSet = [];
  for (let deck of decks) {
    let deckLength = deck.cards.length;
    let indices = Array(deck.cards.length);
    for (let i = 0; i < deck.cards.length; ++i) {
      indices[i] = i;
    }
    indexSet.push(Util.shuffleArray(indices));
  }

  return indexSet;
}

class DeckCollection {
  constructor(decks) {
    this.nextCardId_ = 0;
    this.decks_ = decks;
    this.indexSet_ = createRandomIndexSetForDecks(decks);
    let deckName = this.decks_[0].name;
    if (this.decks_.every(deck => deck.name === deckName)) {
      this.name_ = deckName;
      this.article_ = this.decks_[0].article;
    } else {
      this.name_ = 'Multiple Deck Quiz';
      this.article_ = 'a';
    }
  }

  popUndisplayedCard(settings) {
    if (this.indexSet_.length === 0) {
      return;
    }

    let deckIndex = Math.floor(Math.random() * this.decks_.length);
    let cardIndex = this.indexSet_[deckIndex].pop();

    let deck = this.decks_[deckIndex];
    let card = deepCopy(this.decks_[deckIndex].cards[cardIndex]);

    if (this.indexSet_[deckIndex].length === 0) {
      this.decks_.splice(deckIndex, 1);
      this.indexSet_.splice(deckIndex, 1);
    }

    if (!Array.isArray(card.answer)) {
      card.answer = [card.answer];
    }

    card.deckName = card.deckName || deck.name;
    card.instructions = card.instructions || deck.instructions;
    card.dictionaryLinkStrategy = card.dictionaryLinkStrategy || deck.dictionaryLinkStrategy;
    card.questionCreationStrategy = card.questionCreationStrategy || deck.questionCreationStrategy;
    card.preprocessingStrategy = card.preprocessingStrategy || deck.cardPreprocessingStrategy;
    card.dictionaryLink = card.dictionaryLink || CreateDictionaryLinkStrategy[deck.dictionaryLinkStrategy](card);
    card.answerTimeLimitStrategy = card.answerTimeLimitStrategy || deck.answerTimeLimitStrategy;
    card.discordFinalAnswerListElementStrategy = card.discordFinalAnswerListElementStrategy || deck.discordFinalAnswerListElementStrategy;
    card.discordIntermediateAnswerListElementStrategy = card.discordIntermediateAnswerListElementStrategy || deck.discordIntermediateAnswerListElementStrategy;
    card.scoreAnswerStrategy = card.scoreAnswerStrategy || deck.scoreAnswerStrategy;
    card.additionalAnswerWaitStrategy = card.additionalAnswerWaitStrategy || deck.additionalAnswerWaitStrategy;
    card.id = this.nextCardId_++;
    if (card.unansweredQuestionLimit === undefined) {
      card.unansweredQuestionLimit = settings.unansweredQuestionLimit;
    }
    if (card.answerTimeLimitInMs === undefined) {
      card.answerTimeLimitInMs = AnswerTimeLimitStrategy[card.answerTimeLimitStrategy](settings);
    }
    if (card.additionalAnswerWaitTimeInMs === undefined) {
      card.additionalAnswerWaitTimeInMs = AdditionalAnswerWaitStrategy[card.additionalAnswerWaitStrategy](settings);
    }
    if (card.newQuestionDelayAfterAnsweredInMs === undefined) {
      card.newQuestionDelayAfterAnsweredInMs = settings.newQuestionDelayAfterAnsweredInMs;
    }
    if (card.newQuestionDelayAfterUnansweredInMs === undefined) {
      card.newQuestionDelayAfterUnansweredInMs = settings.newQuestionDelayAfterUnansweredInMs;
    }
    if (card.numberOfReveals === undefined) {
      card.numberOfReveals = RevealsLeftStrategy[card.answerTimeLimitStrategy]();
    }
    card.createQuestion = CreateQuestionStrategy[card.questionCreationStrategy];
    card.preprocess = CardPreprocessingStrategy[card.preprocessingStrategy];
    card.scoreAnswer = ScoreAnswerStrategy[card.scoreAnswerStrategy];
    return card;
  }

  getName() {
    return this.name_;
  }

  getArticle() {
    return this.article_;
  }

  getDeckId() {
    if (this.decks_.length === 1) {
      return this.decks_[0].uniqueId;
    }
    return -1;
  }
}

function updateReviewDeck(sessionId, unansweredCards) {
  try {
    if (unansweredCards.length <= 0) {
      delete state.quizManager.reviewDeckForSessionId[sessionId];
      return false;
    }

    state.quizManager.reviewDeckForSessionId[sessionId] = {
      uniqueId: -1,
      name: 'Review Quiz',
      article: 'a',
      cards: unansweredCards,
    };
    return true;
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error updating review deck', err);
    return false;
  }
}

/* STOPPING */

function createAggregateUnansweredCardsLink(unansweredCards) {
  try {
    if (unansweredCards.length > 0) {
      let dictionaryLinkStrategy = unansweredCards[0].dictionaryLinkStrategy;
      if (CreateAggregateDictionaryLinkStrategy[dictionaryLinkStrategy] && unansweredCards.every(card => card.dictionaryLinkStrategy === dictionaryLinkStrategy)) {
        return CreateAggregateDictionaryLinkStrategy[dictionaryLinkStrategy](unansweredCards);
      }
    }
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error creating aggregated unanswered cards link', err);
    return '';
  }
}

function closeSession(sessionId) {
  let stateForSession = state.quizManager.stateInformationForSessionId[sessionId];
  if (!stateForSession) {
    return;
  }
  stateForSession.scores.commitScores();
  stateForSession.closed = true;
  delete state.quizManager.stateInformationForSessionId[sessionId];
  delete state.quizManager.currentActionForSessionId[sessionId];
}

function stopQuizForError(sessionId) {
  let stateForSession = state.quizManager.stateInformationForSessionId[sessionId];
  if (!stateForSession) {
    return Promise.resolve(); // Already closed the session.
  }

  let promise;
  try {
    let aggregateLink = createAggregateUnansweredCardsLink(stateForSession.unansweredCards);
    promise = stateForSession.messageSender.notifyQuizEndedError(
    stateForSession.deckCollection.getName(),
    stateForSession.scores.getScoreForUserPairs(),
    stateForSession.unansweredCards,
    aggregateLink,
    updateReviewDeck(sessionId, stateForSession.unansweredCards));
  } catch (err) {
    closeSession(sessionId);
    throw err;
  }

  closeSession(sessionId);
  return promise;
}

function stopQuizCommand(sessionId, cancelingUserId) {
  let stateForSession = state.quizManager.stateInformationForSessionId[sessionId];
  if (!stateForSession) {
    return Promise.resolve();
  }
  let aggregateLink = createAggregateUnansweredCardsLink(stateForSession.unansweredCards);
  let promise = stateForSession.messageSender.notifyQuizEndedUserCanceled(
    stateForSession.deckCollection.getName(),
    stateForSession.scores.getScoreForUserPairs(),
    stateForSession.unansweredCards,
    aggregateLink,
    updateReviewDeck(sessionId, stateForSession.unansweredCards),
    cancelingUserId);
  closeSession(sessionId);
  return promise;
}

/* ACTIONS */

class EndQuizScoreLimitReachedAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
  }

  do() {
    let aggregateLink = createAggregateUnansweredCardsLink(this.quizStateInformation_.unansweredCards);
    let promise = Util.retryPromise(
      () => this.quizStateInformation_.messageSender.notifyQuizEndedScoreLimitReached(
        this.quizStateInformation_.deckCollection.getName(),
        this.quizStateInformation_.scores.getScoreForUserPairs(),
        this.quizStateInformation_.unansweredCards,
        aggregateLink,
        updateReviewDeck(this.quizStateInformation_.sessionId, this.quizStateInformation_.unansweredCards),
        this.quizStateInformation_.scores.getScoreLimit()),
      3
    );
    closeSession(this.quizStateInformation_.sessionId);
    return promise;
  }
}

class EndQuizNoQuestionsLeftAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
  }

  do() {
    let aggregateLink = createAggregateUnansweredCardsLink(this.quizStateInformation_.unansweredCards);
    let promise = Util.retryPromise(
      () => this.quizStateInformation_.messageSender.notifyQuizEndedNoQuestionsLeft(
        this.quizStateInformation_.deckCollection.getName(),
        this.quizStateInformation_.scores.getScoreForUserPairs(),
        this.quizStateInformation_.unansweredCards,
        aggregateLink,
        updateReviewDeck(this.quizStateInformation_.sessionId, this.quizStateInformation_.unansweredCards)),
      3
    );
    closeSession(this.quizStateInformation_.sessionId);
    return promise;
  }
}

class EndQuizTooManyWrongAnswersAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
  }

  do() {
    let wrongAnswersCount = this.quizStateInformation_.wrongAnswersInARow;
    let aggregateLink = createAggregateUnansweredCardsLink(this.quizStateInformation_.unansweredCards);
    let promise = Util.retryPromise(
      () => this.quizStateInformation_.messageSender.notifyQuizEndedTooManyWrongAnswers(
        this.quizStateInformation_.deckCollection.getName(),
        this.quizStateInformation_.scores.getScoreForUserPairs(),
        this.quizStateInformation_.unansweredCards,
        aggregateLink,
        updateReviewDeck(this.quizStateInformation_.sessionId, this.quizStateInformation_.unansweredCards),
        wrongAnswersCount),
      3
    );
    closeSession(this.quizStateInformation_.sessionId);
    return promise;
  }
}

class ShowAnswersAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
    this.immediateFeedbackMode_ = quizStateInformation.settings.immediateFeedback;
    this.timedOut_ = false;
  }

  do() {
    let outputPromiseQueue = Promise.resolve();
    if (this.immediateFeedbackMode_) {
      let currentCard = this.quizStateInformation_.currentCard;
      let questionScores = this.quizStateInformation_.currentQuestionScores;
      let answersForUser = questionScores.getAnswersForUser();
      let pointsPerAnswerForUser = questionScores.getPointsPerAnswerForUser();
      let scoreForUserId = this.quizStateInformation_.scores.getScoreForUserId();
      outputPromiseQueue = this.quizStateInformation_.messageSender.outputQuestionScorers(currentCard, questionScores.getAnswerersInOrder(), scoreForUserId, answersForUser, pointsPerAnswerForUser).then(scoreboardId => {
        this.scoreboardId_ = scoreboardId;
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Failed to output the scoredboard.', err);
      });
    }

    return new Promise((fulfill, reject) => {
      let timer = setTimeout(() => {
        try {
          this.timedOut_ = true;
          if (!this.immediateFeedbackMode_) {
            let questionScores = this.quizStateInformation_.currentQuestionScores;
            let answersForUser = questionScores.getAnswersForUser();
            let pointsPerAnswerForUser = questionScores.getPointsPerAnswerForUser();
            let scoreForUserId = this.quizStateInformation_.scores.getScoreForUserId();
            outputPromiseQueue = outputPromiseQueue.then(() => {
              return this.quizStateInformation_.messageSender.outputQuestionScorers(this.quizStateInformation_.currentCard, questionScores.getAnswerersInOrder(), scoreForUserId, answersForUser, pointsPerAnswerForUser);
            }).then(scoreboardId => {
              this.scoreboardId_ = scoreboardId;
            }).catch(err => {
              logger.logFailure(LOGGER_TITLE, 'Failed to output the scoredboard.', err);
            });
          }

          outputPromiseQueue = outputPromiseQueue.then(() => {
            if (this.quizStateInformation_.scores.checkForWin()) {
              return new EndQuizScoreLimitReachedAction(this.quizStateInformation_);
            } else {
              return new WaitAction(this.quizStateInformation_, this.quizStateInformation_.currentCard.newQuestionDelayAfterAnsweredInMs, new AskQuestionAction(this.quizStateInformation_));
            }
          });

          fulfill(outputPromiseQueue);
        } catch (err) {
          reject(err);
        }
      }, this.quizStateInformation_.currentCard.additionalAnswerWaitTimeInMs);
    });
    this.quizStateInformation_.timers.push(timer);

    return outputPromiseQueue;
  }

  tryAcceptUserInput(userId, userName, input) {
    if (this.timedOut_) {
      return false;
    }
    let currentCard = this.quizStateInformation_.currentCard;
    let questionScores = this.quizStateInformation_.currentQuestionScores;
    let totalScores = this.quizStateInformation_.scores;
    if (currentCard.scoreAnswer(userId, userName, input, currentCard, questionScores)) {
      if (this.immediateFeedbackMode_) {
        this.promiseQueue_ = this.promiseQueue_.then(() => {
          let scoreForUserId = totalScores.getScoreForUserId();
          let answersForUser = questionScores.getAnswersForUser();
          let pointsPerAnswerForUser = questionScores.getPointsPerAnswerForUser();
          return this.quizStateInformation_.messageSender.outputQuestionScorers(
            currentCard, questionScores.getAnswerersInOrder(), scoreForUserId, answersForUser, pointsPerAnswerForUser, this.scoreboardId_).then(scoreboardId => {
              this.scoreboardId_ = scoreboardId;
            }).catch(err => {
              logger.logFailure(LOGGER_TITLE, 'Failed to output the scoredboard.', err);
            });
        });
      }
      return true;
    }
    return false;
  }
}

class ShowTimedOutAnswerAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
  }

  do() {
    return this.quizStateInformation_.messageSender.showAnswerTimeout(this.quizStateInformation_.currentCard).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Failed to show timeout message', err);
    }).then(() => {
      if (this.quizStateInformation_.wrongAnswersInARow >= this.quizStateInformation_.currentCard.unansweredQuestionLimit) {
        return new EndQuizTooManyWrongAnswersAction(this.quizStateInformation_);
      } else {
        return new WaitAction(this.quizStateInformation_, this.quizStateInformation_.currentCard.newQuestionDelayAfterUnansweredInMs, new AskQuestionAction(this.quizStateInformation_));
      }
    });
  }
}

class WaitForFirstAnswerAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
  }

  do() {
    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      let timer = setTimeout(() => {
        try {
          ++this.quizStateInformation_.wrongAnswersInARow;
          fulfill(new ShowTimedOutAnswerAction(this.quizStateInformation_));
        } catch(err) {
          reject(err);
        }
      }, this.quizStateInformation_.currentCard.answerTimeLimitInMs);
      this.quizStateInformation_.timers.push(timer);
      let currentCard = this.quizStateInformation_.currentCard;
      this.scheduleReveal_(currentCard.numberOfReveals);
    });
  }

  tryAcceptUserInput(userId, userName, input) {
    let currentCard = this.quizStateInformation_.currentCard;
    if (currentCard.scoreAnswer(userId, userName, input, currentCard, this.quizStateInformation_.currentQuestionScores)) {
      this.quizStateInformation_.wrongAnswersInARow = 0;
      this.quizStateInformation_.unansweredCards.pop();
      this.fulfill_(new ShowAnswersAction(this.quizStateInformation_));
      return true;
    }
    return false;
  }

  scheduleReveal_(numberOfReveals) {
    if (numberOfReveals === 0) {
      return;
    }

    let timer = setTimeout(() => {
      try {
        createTextQuestionWithHint(this.quizStateInformation_.currentCard, this.quizStateInformation_).then(question => {
          return this.quizStateInformation_.messageSender.showQuestion(question, this.quizStateInformation_.shownQuestionId).catch(err => {
            logger.logFailure(LOGGER_TITLE, 'Failed to update reveal.', err);
          });
        }).then(() => {
          this.scheduleReveal_(numberOfReveals - 1);
        });
      } catch(err) {
        this.reject_(err);
      }
    }, REVEAL_INTERVAL_IN_MS);
    this.quizStateInformation_.timers.push(timer);
  }
}

class AskQuestionAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
  }

  do() {
    if (this.quizStateInformation_.closed) {
      return Promise.resolve();
    }

    let questionScores = new QuestionScores();
    this.quizStateInformation_.currentQuestionScores = questionScores;
    this.quizStateInformation_.scores.addQuestionScores(questionScores);
    let nextCard = this.quizStateInformation_.deckCollection.popUndisplayedCard(this.quizStateInformation_.settings);
    if (!nextCard) {
      return Promise.resolve(new EndQuizNoQuestionsLeftAction(this.quizStateInformation_));
    }

    let preprocessPromise = Promise.resolve(nextCard);
    if (!nextCard.wasPreprocessed) {
      preprocessPromise = nextCard.preprocess(nextCard);
    }

    return preprocessPromise.then(card => {
      if (card === false) {
        return this.do();
      }
      card.wasPreprocessed = true;
      this.quizStateInformation_.currentCard = card;
      this.quizStateInformation_.unansweredCards.push(card);
      return card.createQuestion(card, this.quizStateInformation_).then(question => {
        return Util.retryPromise(() => this.quizStateInformation_.messageSender.showQuestion(question), 3).catch(err => {
          logger.logFailure(LOGGER_TITLE, 'Error showing question', err);
        });
      }).then(shownQuestionId => {
        this.quizStateInformation_.shownQuestionId = shownQuestionId;
        return new WaitForFirstAnswerAction(this.quizStateInformation_);
      });
    });
  }
}

class StartAction {
  constructor(quizStateInformation) {
    this.quizStateInformation_ = quizStateInformation;
  }

  do() {
    let deckCollection = this.quizStateInformation_.deckCollection;
    return this.quizStateInformation_.messageSender.notifyStarting(INITIAL_DELAY_IN_MS, deckCollection.getName(), deckCollection.getArticle()).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Error showing quiz starting message', err);
    }).then(() => {
      let askQuestionAction = new AskQuestionAction(this.quizStateInformation_);
      return new WaitAction(this.quizStateInformation_, INITIAL_DELAY_IN_MS, askQuestionAction);
    });
  }
}

class WaitAction {
  constructor(quizStateInformation, waitInterval, nextAction) {
    this.waitInterval_ = waitInterval;
    this.quizStateInformation_ = quizStateInformation;
    this.nextAction_ = nextAction;
  }

  do() {
    return new Promise((fulfill, reject) => {
      setTimeout(() => {
        try {
          fulfill(this.nextAction_);
        } catch (err) {
          reject(err);
        }
      }, this.waitInterval_);
    });
  }
}

function chainActions(sessionId, action) {
  let stateInformation = state.quizManager.stateInformationForSessionId[sessionId];
  if (!action || !action.do || !stateInformation) {
    return Promise.resolve();
  }
  state.quizManager.currentActionForSessionId[sessionId] = action;

  return action.do().then(result => {
    stateInformation.timers.forEach(timer => clearTimeout(timer));
    stateInformation.timers = [];
    return chainActions(sessionId, result);
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error', err);
    return stopQuizForError(sessionId);
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error stopping the quiz in response to an error. Bad state possible.', err);
  });
}

/* EXPORT */

const CreateSessionFailureReason = {
  ALREADY_RUNNING: 'Already a quiz running',
  DECK_NOT_FOUND: 'Deck not found',
  NO_REVIEW_DECK: 'No review deck available',
};

function checkQuizRunning(sessionId) {
  return !!state.quizManager.stateInformationForSessionId[sessionId];
}

function findNonExistentDeck(deckNames) {
  for (let deckName of deckNames) {
    if (!state.quizManager.deckForName[deckName]) {
      return deckName;
    }
  }
}

function tryCreateQuizError(sessionId, deckNames) {
  if (checkQuizRunning(sessionId)) {
    return {
      errorType: CreateSessionFailureReason.ALREADY_RUNNING,
    };
  }

  let nonExistentDeckName = findNonExistentDeck(deckNames);
  if (nonExistentDeckName) {
    return {
      errorType: CreateSessionFailureReason.DECK_NOT_FOUND,
      nonExistentDeckName: nonExistentDeckName,
    };
  }
}

function startQuiz(sessionId, deckCollection, messageSender, scoreScopeId, settingsBlob, settingsOverrides, isReview) {
  settingsOverrides = settingsOverrides.map(str => parseFloat(str));
  let scoreLimitOverride = settingsOverrides[0];
  let timeBetweenQuestionsOverride = settingsOverrides[1];
  let timeoutOverrideInS = settingsOverrides[2];

  if (scoreLimitOverride !== undefined) {
    scoreLimitOverride = Math.max(scoreLimitOverride, 1);
  }
  if (timeBetweenQuestionsOverride !== undefined) {
    timeBetweenQuestionsOverride = Math.max(timeBetweenQuestionsOverride, 0);
    timeBetweenQuestionsOverride = Math.min(timeBetweenQuestionsOverride, 120);
  }
  if (timeoutOverrideInS !== undefined) {
    timeoutOverrideInS = Math.max(timeoutOverrideInS, 4);
    timeoutOverrideInS = Math.min(timeoutOverrideInS, 120);
  }

  let scoreLimit;
  if (isReview) {
    scoreLimit = Number.MAX_SAFE_INTEGER;
  } else {
    scoreLimit = scoreLimitOverride || settingsBlob['quiz/japanese/score_limit'];
  }

  let newQuestionDelayAfterUnansweredInS = settingsBlob['quiz/japanese/new_question_delay_after_unanswered'];
  let newQuestionDelayAfterAnsweredInS = settingsBlob['quiz/japanese/new_question_delay_after_answered'];
  let additionalAnswerWaitTimeInS = settingsOverrides[1] || settingsBlob['quiz/japanese/additional_answer_wait_time'];
  if (timeBetweenQuestionsOverride !== undefined) {
    newQuestionDelayAfterUnansweredInS = timeBetweenQuestionsOverride;
    newQuestionDelayAfterAnsweredInS = 0;
    additionalAnswerWaitTimeInS = timeBetweenQuestionsOverride;
  }

  let quizState = {
    scores: new Scores(scoreLimit, deckCollection.getDeckId(), scoreScopeId),
    deckCollection: deckCollection,
    messageSender: messageSender,
    sessionId: sessionId,
    wrongAnswersInARow: 0,
    unansweredCards: [],
    timers: [],
    settings: {
      serverQuizSettings: settingsBlob,
      unansweredQuestionLimit: settingsBlob['quiz/japanese/unanswered_question_limit'],
      immediateFeedback: settingsBlob['quiz/japanese/immediate_feedback'],
      newQuestionDelayAfterAnsweredInMs: newQuestionDelayAfterAnsweredInS * 1000,
      newQuestionDelayAfterUnansweredInMs: newQuestionDelayAfterUnansweredInS * 1000,
      additionalAnswerWaitTimeInMs: additionalAnswerWaitTimeInS * 1000,
      timeoutOverrideInMs: timeoutOverrideInS * 1000,
    },
  };
  state.quizManager.stateInformationForSessionId[sessionId] = quizState;
  chainActions(sessionId, new StartAction(quizState));
}

class QuizManager {
  tryCreateQuizSession(messageSender, sessionId, sessionArguments, scoreScopeId, settingsBlob) {
    sessionArguments = sessionArguments.toLowerCase();
    sessionArguments = sessionArguments.split(' ');
    let decksArgument = sessionArguments.shift();
    let deckNames = decksArgument.split('+');
    let error = tryCreateQuizError(sessionId, deckNames);
    if (error) {
      return error;
    }

    let decks = [];
    for (let deckName of deckNames) {
      decks.push(state.quizManager.deckForName[deckName]);
    }
    let deckCollection = new DeckCollection(decks);
    startQuiz(sessionId, deckCollection, messageSender, scoreScopeId, settingsBlob, sessionArguments, false);
  }

  tryCreateReviewQuizSession(messageSender, sessionId, scoreScopeId, settingsBlob) {
    let deck = state.quizManager.reviewDeckForSessionId[sessionId];
    if (!deck) {
      return {
        errorType: CreateSessionFailureReason.NO_REVIEW_DECK,
      };
    }
    let deckCollection = new DeckCollection([deck]);
    startQuiz(sessionId, deckCollection, messageSender, scoreScopeId, settingsBlob, [], false);
  }

  processUserInput(sessionId, userId, userName, input) {
    input = input.toLowerCase();
    let currentAction = state.quizManager.currentActionForSessionId[sessionId];
    if (!currentAction) {
      return false;
    }
    if (currentAction.tryAcceptUserInput) {
      return currentAction.tryAcceptUserInput(userId, userName, input);
    }
    return false;
  }

  stopQuiz(sessionId, cancelingUserId) {
    return stopQuizCommand(sessionId, cancelingUserId);
  }

  getDesiredSettings() {
    return [
      'quiz/japanese/answer_time_limit',
      'quiz/japanese/score_limit',
      'quiz/japanese/unanswered_question_limit',
      'quiz/japanese/new_question_delay_after_unanswered',
      'quiz/japanese/new_question_delay_after_answered',
      'quiz/japanese/additional_answer_wait_time',
      'quiz/japanese/immediate_feedback',
    ];
  }

  hasQuizSession(sessionId) {
    return !!state.quizManager.currentActionForSessionId[sessionId];
  }
}

module.exports = new QuizManager();
module.exports.CreateSessionFailureReason = CreateSessionFailureReason;
