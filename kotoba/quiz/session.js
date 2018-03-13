const reload = require('require-reload')(require);
const Scores = reload('./scores.js');
const logger = reload('monochrome-bot').logger;
const state = require('./../static_state.js');
const cardStrategies = reload('./card_strategies.js');
const DeckCollection = reload('./deck_collection.js');
const assert = require('assert');
const gameModes = [
  reload('./normal_mode.js'),
  reload('./mastery_mode.js'),
  reload('./conquest_mode.js'),
];

const LOGGER_TITLE = 'QUIZ';

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function createReviewDeck(unansweredCards) {
  return {
    uniqueId: -1,
    name: 'Review Quiz',
    article: 'a',
    cards: deepCopy(unansweredCards),
  }
}

function updateReviewDecks(locationId, sessionInformation) {
  try {
    let reviewDeckCreated = false;
    let users = sessionInformation.getAllKnownUsers();
    for (let userId of users) {
      let unansweredCards = sessionInformation.getUnansweredCards(userId);
      if (unansweredCards.length > 0) {
        state.quizManager.reviewDeckForUserId[userId] = createReviewDeck(unansweredCards);
        reviewDeckCreated = true;
      } else {
        delete state.quizManager.reviewDeckForUserId[userId];
      }
    }

    let cardsNoOneAnswered = sessionInformation.getUnansweredCards();

    if (cardsNoOneAnswered.length <= 0) {
      delete state.quizManager.reviewDeckForLocationId[locationId];
    } else {
      state.quizManager.reviewDeckForLocationId[locationId] = createReviewDeck(cardsNoOneAnswered);
      reviewDeckCreated = true;
    }

    return reviewDeckCreated;
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error updating review deck', err);
    return false;
  }
}

class SessionInformation {
  constructor() {
    this.unansweredQuestionsInARow_ = 0;
    this.timers_ = [];
    this.currentCard_ = undefined;
  }

  static createNew(locationId, ownerId, deckCollection, messageSender, scoreScopeId, settings, gameMode) {
    let session = new SessionInformation();
    session.deckCollection_ = deckCollection;
    session.messageSender_ = messageSender;
    session.locationId_ = locationId;
    session.gameMode_ = gameMode;
    session.settings_ = settings;
    session.scores_ = Scores.createNew(session.settings_.scoreLimit, deckCollection.getDeckId(), scoreScopeId);
    session.ownerId_ = ownerId;
    session.startTime_ = Date.now();
    session.numCardsAnswered_ = 0;
    return session;
  }

  static async createFromSaveData(locationId, saveData, scoreScopeId, messageSender) {
    let session = new SessionInformation();
    let deckCollection = await DeckCollection.createFromSaveData(saveData.deckCollectionSaveData);
    let gameMode = gameModes.find(mode => mode.serializationIdentifier === saveData.gameModeIdentifier);

    session.deckCollection_ = deckCollection;
    session.messageSender_ = messageSender;
    session.locationId_ = locationId;
    session.gameMode_ = gameMode;
    session.scores_ = Scores.createFromSaveData(scoreScopeId, saveData.scoresSaveData);
    session.unansweredQuestionsInARow_ = saveData.unansweredQuestionsInARow;
    session.settings_ = saveData.settings;
    session.ownerId_ = saveData.ownerId;
    session.startTime_ = saveData.startTime;
    session.numCardsAnswered_ = saveData.numCardsAnswered;

    return session;
  }

  containsInternetCards() {
    return this.deckCollection_.containsInternetCards();
  }

  tryAcceptAnswer(userId, userName, input) {
    let currentCard = this.getCurrentCard();
    let totalScores = this.getScores();
    let gotPoints = currentCard.scoreAnswer(userId, userName, input, currentCard, totalScores);
    if (gotPoints && currentCard.mostRecentApperanceAnswerers.indexOf(userId) === -1) {
      currentCard.mostRecentApperanceAnswerers.push(userId);
    }
    return gotPoints;
  }

  finalize(gameOver) {
    this.clearTimers();
    if (gameOver) {
      this.createdReviewDecks_ = updateReviewDecks(this.locationId_, this);
      this.commitGameModeScoresForGameOver_();
    }
    return this.scores_.commitScores();
  }

  createAggregateUnansweredCardsLink() {
    let unansweredCards = this.getUnansweredCards();
    try {
      if (unansweredCards.length > 0) {
        let dictionaryLinkStrategy = unansweredCards[0].dictionaryLinkStrategy;
        if (cardStrategies.CreateAggregateDictionaryLinkStrategy[dictionaryLinkStrategy] && unansweredCards.every(card => card.dictionaryLinkStrategy === dictionaryLinkStrategy)) {
          return cardStrategies.CreateAggregateDictionaryLinkStrategy[dictionaryLinkStrategy](unansweredCards);
        }
      }
    } catch (err) {
      logger.logFailure(LOGGER_TITLE, 'Error creating aggregated unanswered cards link', err);
      return '';
    }
  }

  getLocationId() {
    return this.locationId_;
  }

  getDidCreateReviewDecks() {
    return this.createdReviewDecks_;
  }

  getScoresForUserPairs() {
    return this.scores_.getScoresForUserPairs();
  }

  commitGameModeScoresForGameOver_() {
    let deckDepleted = this.deckCollection_.isEmpty();
      return this.getGameMode().updateGameModeLeaderboardForSessionEnded(
        this.deckCollection_.getDeckId(),
        this.getScores().getRoundedScoresForLb(),
        this.startTime_,
        this.numCardsAnswered_,
        deckDepleted,
        this.getSettings().gameModeSettings);
  }

  createSaveData() {
    return {
      deckCollectionSaveData: this.deckCollection_.createSaveData(),
      scoresSaveData: this.scores_.createSaveData(),
      unansweredQuestionsInARow: this.getUnansweredQuestionsInARow(),
      gameModeIdentifier: this.gameMode_.serializationIdentifier,
      settings: this.getSettings(),
      ownerId: this.getOwnerId(),
      startTime: this.startTime_,
      numCardsAnswered: this.numCardsAnswered_,
    }
  }

  getOwnerId() {
    assert(this.ownerId_, 'No owner id');
    return this.ownerId_;
  }

  getGameModeIdentifier() {
    return this.gameMode_.serializationIdentifier;
  }

  getScores() {
    return this.scores_;
  }

  getNextCard() {
    return this.deckCollection_.popUndisplayedCard(this.getSettings());
  }

  getSettings() {
    return this.settings_;
  }

  getQuizName() {
    return this.deckCollection_.getName();
  }

  getQuizArticle() {
    return this.deckCollection_.getArticle();
  }

  containsInternetCards() {
    return this.deckCollection_.containsInternetCards();
  }

  getMessageSender() {
    return this.messageSender_;
  }

  getUnansweredQuestionsInARow() {
    return this.unansweredQuestionsInARow_;
  }

  getUnansweredCards(userId) {
    // HACK: This is convenient, but pretty hacky. If the game is review mode, pop all the undisplayed cards
    // in order to move them into the cache so that they are considered unanswered.
    // This hack means that this method must not be called before the game is over.
    // https://github.com/mistval/kotoba/issues/29
    if (this.getGameMode().isReviewMode) {
      while (this.deckCollection_.popUndisplayedCard(this.settings_)) {
        // NOOP
      }
    }

    let unansweredCards = [];
    for (let card of this.deckCollection_.getCachedPreviousCards()) {
      if ((!userId && card.mostRecentApperanceAnswerers.length === 0) || (userId && !~card.mostRecentApperanceAnswerers.indexOf(userId))) {
        unansweredCards.push(card);
      }
    }
    return unansweredCards;
  }

  getAllKnownUsers() {
    let users = [];
    for (let card of this.deckCollection_.getCachedPreviousCards()) {
      for (let answerer of card.mostRecentApperanceAnswerers) {
        if (users.indexOf(answerer) === -1) {
          users.push(answerer);
        }
      }
    }
    return users;
  }

  getName() {
    return this.deckCollection_.getName();
  }

  addTimer(timer) {
    this.timers_.push(timer);
  }

  clearTimers() {
    this.timers_.forEach(clearTimeout);
    this.timers_ = [];
  }

  getGameMode() {
    return this.gameMode_;
  }

  setCurrentCard(card) {
    this.currentCard_ = card;
    ++this.unansweredQuestionsInARow_;
    card.answerHistory.push(false);
  }

  markCurrentCardAnswered() {
    this.unansweredQuestionsInARow_ = 0;
    this.getCurrentCard().answerHistory.pop();
    this.getCurrentCard().answerHistory.push(true);
    ++this.numCardsAnswered_;
    this.recycleCurrentCard_();
  }

  markCurrentCardUnanswered() {
    // HACK. Unhackify this.
    let newTimeLimit = this.getGameMode().updateAnswerTimeLimitForUnansweredQuestion(this.getSettings().answerTimeLimitInMs, this.getSettings().gameModeSettings);
    if (newTimeLimit !== this.getSettings().answerTimeLimitInMs) {
      this.getSettings().answerTimeLimitOverriden = true;
      this.getSettings().answerTimeLimitInMs = newTimeLimit;
    }
    this.recycleCurrentCard_();
  }

  getCurrentCard() {
    return this.currentCard_;
  }

  checkTooManyWrongAnswers() {
    return this.getUnansweredQuestionsInARow() >= this.getCurrentCard().unansweredQuestionLimit;
  }

  recycleCurrentCard_() {
    this.deckCollection_.recycleCard(this.getCurrentCard(), this.getGameMode());
  }
}

module.exports = SessionInformation;
