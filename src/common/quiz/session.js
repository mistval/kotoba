const reload = require('require-reload')(require);
const globals = require('./../globals.js');
const Scores = reload('./scores.js');
const state = require('./../static_state.js');
const cardStrategies = reload('./card_strategies.js');
const DeckCollection = reload('./deck_collection.js');
const deckLoader = reload('./deck_loader.js');
const gameModes = [
  reload('./normal_mode.js'),
  reload('./mastery_mode.js'),
  reload('./conquest_mode.js'),
];

const LOGGER_TITLE = 'QUIZ';

function createReviewDeck(unansweredCards) {
  return deckLoader.createReviewDeck(unansweredCards);
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
    globals.logger.logFailure(LOGGER_TITLE, 'Error updating review deck', err);
    return false;
  }
}

class SessionInformation {
  constructor() {
    this.unansweredQuestionsInARow_ = 0;
    this.timers_ = [];
    this.currentCard_ = undefined;
  }

  static createNew(locationId, ownerId, deckCollection, messageSender, scoreScopeId, settings, gameMode, hardcore) {
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
    session.hardcore_ = hardcore;
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
    session.hardcore_ = !!saveData.hardcore;

    return session;
  }

  requiresAudioConnection() {
    return this.deckCollection_.requiresAudioConnection();
  }

  containsInternetCards() {
    return this.deckCollection_.containsInternetCards();
  }

  tryAcceptAnswer(userId, userName, input) {
    let currentCard = this.getCurrentCard();
    let totalScores = this.getScores();
    let gotPoints = currentCard.scoreAnswer(userId, userName, input, currentCard, totalScores);
    if (gotPoints && currentCard.mostRecentAppearanceAnswerers.indexOf(userId) === -1) {
      currentCard.mostRecentAppearanceAnswerers.push(userId);
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
      globals.logger.logFailure(LOGGER_TITLE, 'Error creating aggregated unanswered cards link', err);
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
        this.getScores().getScoresForLb(),
        this.startTime_,
        this.numCardsAnswered_,
        deckDepleted,
        this.getSettings().gameModeSettings);
  }

  oneAnswerPerPlayer() {
    return this.hardcore_;
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
      hardcore: this.hardcore_,
    }
  }

  getOwnerId() {
    return this.ownerId_;
  }

  getGameModeIdentifier() {
    return this.gameMode_.serializationIdentifier;
  }

  getScores() {
    return this.scores_;
  }

  getNextCard() {
    return this.deckCollection_.popUndisplayedCard(this.getSettings(), this.gameMode_);
  }

  getSettings() {
    return this.settings_;
  }

  getQuizName() {
    return this.deckCollection_.getName();
  }

  getQuizDescription() {
    return this.deckCollection_.getDescription();
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
    let unansweredCards = [];
    for (let card of this.deckCollection_.getPreviousShownCards()) {
      if (!card.mostRecentAppearanceAnswerers || (!userId && card.mostRecentAppearanceAnswerers.length === 0) || (userId && !~card.mostRecentAppearanceAnswerers.indexOf(userId))) {
        unansweredCards.push(card);
      }
    }

    if (this.getGameMode().isReviewMode) {
      let undisplayedCards = this.deckCollection_.getAllUndisplayedCards();
      unansweredCards = unansweredCards.concat(undisplayedCards);
    }

    return unansweredCards;
  }

  getAllKnownUsers() {
    let users = [];
    for (let card of this.deckCollection_.getPreviousShownCards()) {
      if (card.mostRecentAppearanceAnswerers) {
        for (let answerer of card.mostRecentAppearanceAnswerers) {
          if (users.indexOf(answerer) === -1) {
            users.push(answerer);
          }
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
