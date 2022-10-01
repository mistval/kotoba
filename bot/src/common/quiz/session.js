
const globals = require('./../globals.js');
const Scores = require('./scores.js');
const cardStrategies = require('./card_strategies.js');
const DeckCollection = require('./deck_collection.js');
const deckLoader = require('./deck_loader.js');
const gameModes = [
  require('./normal_mode.js'),
  require('./mastery_mode.js'),
  require('./conquest_mode.js'),
];

async function updateReviewDecks(locationId, sessionInformation) {
  try {
    let users = sessionInformation.getAllKnownUsers();

    const promises = [];
    for (let userId of users) {
      let unansweredCards = sessionInformation.getUnansweredCards(userId);
      promises.push(deckLoader.updateUserReviewDeck(unansweredCards, userId));
    }

    let cardsNoOneAnswered = sessionInformation.getUnansweredCards();
    promises.push(deckLoader.updateLocationReviewDeck(cardsNoOneAnswered, locationId));

    await Promise.all(promises);
  } catch (err) {
    globals.logger.error({
      event: 'ERROR UPDATING REVIEW DECK',
      err,
    });
  }
}

class SessionInformation {
  constructor() {
    this.unansweredQuestionsInARow_ = 0;
    this.timers_ = [];
    this.currentCard_ = undefined;
  }

  static createNew(rawStartCommand, locationId, ownerId, deckCollection, messageSender, scoreScopeId, settings, gameMode, hardcore, noRace) {
    let session = new SessionInformation();
    session.rawStartCommand_ = rawStartCommand;
    session.isLoaded_ = false;
    session.deckCollection_ = deckCollection;
    session.messageSender_ = messageSender;
    session.locationId_ = locationId;
    session.gameMode_ = gameMode;
    session.settings_ = settings;
    session.scores_ = Scores.createNew(session.settings_.scoreLimit, deckCollection.getDeckId(), scoreScopeId);
    session.ownerId_ = ownerId;
    session.startTime_ = Date.now();
    session.numCardsAnswered_ = 0;
    session.numCardsUnanswered_ = 0;
    session.hardcore_ = hardcore;
    session.noRace_ = noRace;
    return session;
  }

  static async createFromSaveData(rawStartCommand, locationId, saveData, scoreScopeId, messageSender, settings) {
    let session = new SessionInformation();
    let deckCollection = await DeckCollection.createFromSaveData(saveData.deckCollectionSaveData);
    let gameMode = gameModes.find(mode => mode.serializationIdentifier === saveData.gameModeIdentifier);

    session.rawStartCommand_ = rawStartCommand;
    session.isLoaded_ = true;
    session.deckCollection_ = deckCollection;
    session.messageSender_ = messageSender;
    session.locationId_ = locationId;
    session.gameMode_ = gameMode;
    session.scores_ = Scores.createFromSaveData(scoreScopeId, saveData.scoresSaveData);
    session.unansweredQuestionsInARow_ = saveData.unansweredQuestionsInARow;
    session.settings_ = { ...saveData.settings, ...settings };
    session.ownerId_ = saveData.ownerId;
    session.startTime_ = saveData.startTime;
    session.numCardsAnswered_ = saveData.numCardsAnswered;
    session.hardcore_ = !!saveData.hardcore;
    session.noRace_ = !!saveData.noRace;
    session.numCardsUnanswered_ = saveData.numCardsUnanswered || 0;
    session.saveNameOverride_ = saveData.saveNameOverride;

    return session;
  }

  getRawStartCommand() {
    return this.rawStartCommand_;
  }

  getIsLoaded() {
    return this.isLoaded_;
  }

  getScoreScopeId() {
    return this.scores_.scoreScopeId;
  }

  getRestrictedDeckNameForThisScoreScope() {
    const decks = this.getDeckInfo();
    const scoreScope = this.getScoreScopeId();
    const locationId = this.getLocationId();

    return decks.find(d => {
      const restrictTo = d.restrictToServers ?? [];
      return restrictTo.length > 0 && !restrictTo.includes(scoreScope) && !restrictTo.includes(locationId);
    });
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

  async finalize(gameOver) {
    this.clearTimers();
    if (gameOver) {
      await updateReviewDecks(this.locationId_, this);
    }
    return this.scores_.commitScores();
  }

  getRemainingCardCount() {
    return this.deckCollection_.getRemainingCardCount();
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
      globals.logger.error({
        event: 'ERROR CREATING AGGREGATED CARD LINK',
        err,
      });
      return '';
    }
  }

  getLocationId() {
    return this.locationId_;
  }

  getScoresForUserPairs() {
    return this.scores_.getScoresForUserPairs();
  }

  oneAnswerPerPlayer() {
    return this.hardcore_;
  }

  isNoRace() {
    return this.noRace_;
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
      noRace: this.noRace_,
      numCardsUnanswered: this.numCardsUnanswered_,
      saveNameOverride: this.saveNameOverride_,
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

  getUnansweredQuestionsTotal() {
    return this.numCardsUnanswered_;
  }

  getUnansweredCards(userId) {
    let unansweredCards = [];
    for (let card of this.deckCollection_.getPreviousShownCards()) {
      if (card.discarded) {
        continue;
      }
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

  getSaveName() {
    return this.saveNameOverride_ || this.getName();
  }

  setSaveName(saveName) {
    this.saveNameOverride_ = saveName || this.saveNameOverride_;
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
    let newTimeLimit = this.getGameMode().updateAnswerTimeLimitForUnansweredQuestion(this.getSettings().answerTimeLimitInMs);
    if (newTimeLimit !== this.getSettings().answerTimeLimitInMs) {
      this.getSettings().answerTimeLimitOverriden = true;
      this.getSettings().answerTimeLimitInMs = newTimeLimit;
    }
    ++this.numCardsUnanswered_;
    this.recycleCurrentCard_();
  }

  getCurrentCard() {
    return this.currentCard_;
  }

  checkTooManyWrongAnswersInARow() {
    return this.getUnansweredQuestionsInARow() >= this.getCurrentCard().unansweredQuestionLimit;
  }

  checkTooManyWrongAnswersTotal() {
    return this.getSettings().maxMissedQuestions && this.getUnansweredQuestionsTotal() >= this.getSettings().maxMissedQuestions;
  }

  getDeckInfo() {
    return this.deckCollection_.decks.map((deck) => ({
      restrictToServers: deck.restrictToServers,
      hidden: deck.hidden,
      name: deck.name,
      shortName: deck.shortName,
      uniqueId: deck.uniqueId,
      startIndex: deck.startIndex,
      endIndex: deck.endIndex,
      mc: deck.mc,
      internetDeck: deck.isInternetDeck,
      appearanceWeight: deck.appearanceWeight,
    }));
  }

  recycleCurrentCard_() {
    this.deckCollection_.recycleCard(this.getCurrentCard(), this.getGameMode());
  }
}

module.exports = SessionInformation;
