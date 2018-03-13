'use strict'
const reload = require('require-reload')(require);
const Util = reload('./../utils.js');
const cardStrategies = reload('./card_strategies.js');
const deckLoader = reload('./deck_loader.js');
const assert = require('assert');

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function createRandomIndexSetForDecks(decks) {
  let indexSet = [];
  for (let deck of decks) {
    let startIndex = deck.startIndex || 0;
    let endIndex = deck.endIndex === undefined ? deck.cards.length - 1 : deck.endIndex;
    let indices = Array(endIndex - startIndex + 1);
    for (let i = startIndex; i <= endIndex; ++i) {
      indices[i] = i;
    }
    indexSet.push(Util.shuffleArray(indices));
  }

  return indexSet;
}

function decompileCard(card) {
  if (card.q) {
    card.question = card.q;
    delete card.q;
  }
  if (card.a) {
    card.answer = card.a;
    delete card.a;
  }
  if (card.m) {
    card.meaning = card.m;
    delete card.m;
  }
  if (card.p) {
    card.pointsForAnswer = card.p;
    delete card.p;
  }
  return card;
}

class DeckCollection {
  static createNewFromDecks(decks, gameMode) {
    let deckCollection = new DeckCollection();
    deckCollection.nextCardId_ = 0;
    deckCollection.decks_ = decks;
    deckCollection.indexSet_ = createRandomIndexSetForDecks(decks);
    let deckName = deckCollection.decks_[0].name;
    if (deckCollection.decks_.every(deck => deck.name === deckName)) {
      deckCollection.name_ = deckName;
      deckCollection.article_ = deckCollection.decks_[0].article;
    } else {
      deckCollection.name_ = 'Multiple Deck Quiz';
      deckCollection.article_ = 'a';
    }

    deckCollection.name_ = gameMode.overrideDeckTitle(deckCollection.name_);

    deckCollection.previousCardCache_ = [];
    for (let deck of decks) {
      deckCollection.previousCardCache_.push({});
    }

    return deckCollection;
  }

  static async createFromSaveData(saveData) {
    let deckQueries = saveData.deckUniqueIds.map((uniqueId, index) => {
      let numberOfOptions = saveData.numberOfOptionsForDeck ? saveData.numberOfOptionsForDeck[index] : 0;
      return {deckNameOrUniqueId: uniqueId, numberOfOptions};
    });

    let deckLookupStatus = await deckLoader.getQuizDecks(deckQueries);
    let deckCollection = new DeckCollection();
    deckCollection.decks_ = deckLookupStatus.decks;
    assert(deckCollection.decks_, `couldn't find a save deck by unique ID`);
    deckCollection.indexSet_ = saveData.indexSet;
    deckCollection.name_ = saveData.name;
    deckCollection.article_ = saveData.article;
    deckCollection.nextCardId_ = saveData.nextCardId;
    deckCollection.previousCardCache_ = saveData.previousCardCache;
    return deckCollection;
  }

  containsInternetCards() {
    return this.decks_.some(deck => {
      if (deck.isInternetDeck === undefined) {
        return deck.cards.some(card => card.isInternetCard);
      }
      return deck.isInternetDeck;
    });
  }

  getCachedPreviousCards() {
    let cards = [];
    for (let cachedDeck of this.previousCardCache_) {
      for (let cachedCard of Object.keys(cachedDeck).map(key => cachedDeck[key])) {
        cards.push(cachedCard);
      }
    }
    return cards;
  }

  isEmpty() {
    for (let array of this.indexSet_) {
      if (array.length > 0) {
        return false;
      }
    }
    return true;
  }

  popUndisplayedCard(settings) {
    if (this.isEmpty()) {
      return;
    }

    let numDecksWithCardsLeft = this.indexSet_.reduce((numDecksWithCardsLeft, deck) => deck.length > 0 ? numDecksWithCardsLeft + 1 : numDecksWithCardsLeft , 0);

    let deckWithCardsLeftIndex = Math.floor(Math.random() * numDecksWithCardsLeft);
    let deckIndex = 0;
    for (let array of this.indexSet_) {
      if (array.length > 0) {
        --deckWithCardsLeftIndex;
      }
      if (deckWithCardsLeftIndex === -1) {
        break;
      }
      ++deckIndex;
    }

    let cardIndex = this.indexSet_[deckIndex].pop();
    let deck = this.decks_[deckIndex];

    let card = this.previousCardCache_[deckIndex][cardIndex];
    if (!card) {
      let deckCard = this.decks_[deckIndex].cards[cardIndex];
      if (!deckCard) {
        return this.popUndisplayedCard(settings);
      }
      card = decompileCard(deepCopy(deckCard));
    }

    if (!Array.isArray(card.answer)) {
      card.answer = [card.answer];
    }

    if (card.answer.length === 0 || card.answer[0] === '') {
      logger.logFailure(LOGGER_TITLE, 'Card with no answer: ' + card.question);
      return this.popUndisplayedCard(settings);
    }

    card.deckName = card.deckName || deck.name;
    card.instructions = card.instructions || deck.instructions;
    card.dictionaryLinkStrategy = card.dictionaryLinkStrategy || deck.dictionaryLinkStrategy;
    card.questionCreationStrategy = card.questionCreationStrategy || deck.questionCreationStrategy;
    card.preprocessingStrategy = card.preprocessingStrategy || deck.cardPreprocessingStrategy;
    card.answerTimeLimitStrategy = card.answerTimeLimitStrategy || deck.answerTimeLimitStrategy;
    card.discordFinalAnswerListElementStrategy = card.discordFinalAnswerListElementStrategy || deck.discordFinalAnswerListElementStrategy;
    card.discordIntermediateAnswerListElementStrategy = card.discordIntermediateAnswerListElementStrategy || deck.discordIntermediateAnswerListElementStrategy;
    card.scoreAnswerStrategy = card.scoreAnswerStrategy || deck.scoreAnswerStrategy;
    card.additionalAnswerWaitStrategy = card.additionalAnswerWaitStrategy || deck.additionalAnswerWaitStrategy;
    card.answerCompareStrategy = card.answerCompareStrategy || deck.answerCompareStrategy;
    card.numberOfOptions = card.numberOfOptions || deck.numberOfOptions;
    card.commentFieldName = card.commentFieldName || deck.commentFieldName;
    card.answerHistory = card.answerHistory || [];
    card.cardIndex = cardIndex;
    card.deckIndex = deckIndex;
    card.mostRecentApperanceAnswerers = [];
    if (card.isInternetCard === undefined) {
      card.isInternetCard = deck.isInternetDeck;
    }
    if (card.id === undefined) {
      card.id = this.nextCardId_++;
    }
    if (card.dictionaryLink === undefined) {
      card.dictionaryLink = cardStrategies.CreateDictionaryLinkStrategy[deck.dictionaryLinkStrategy](card);
    }
    if (card.unansweredQuestionLimit === undefined) {
      card.unansweredQuestionLimit = settings.unansweredQuestionLimit;
    }
    if (card.answerTimeLimitInMs === undefined) {
      card.answerTimeLimitInMs = cardStrategies.AnswerTimeLimitStrategy[card.answerTimeLimitStrategy](settings);
    }
    if (card.additionalAnswerWaitTimeInMs === undefined) {
      card.additionalAnswerWaitTimeInMs = cardStrategies.AdditionalAnswerWaitStrategy[card.additionalAnswerWaitStrategy](settings);
    }
    if (card.newQuestionDelayAfterAnsweredInMs === undefined) {
      card.newQuestionDelayAfterAnsweredInMs = settings.newQuestionDelayAfterAnsweredInMs;
    }
    if (card.newQuestionDelayAfterUnansweredInMs === undefined) {
      card.newQuestionDelayAfterUnansweredInMs = settings.newQuestionDelayAfterUnansweredInMs;
    }
    if (card.numberOfReveals === undefined) {
      card.numberOfReveals = cardStrategies.RevealsLeftStrategy[card.answerTimeLimitStrategy]();
    }
    if (card.compareAnswer === undefined) {
      card.compareAnswer = cardStrategies.AnswerCompareStrategy[card.answerCompareStrategy];
    }
    card.createQuestion = cardStrategies.CreateQuestionStrategy[card.questionCreationStrategy];
    card.preprocess = cardStrategies.CardPreprocessingStrategy[card.preprocessingStrategy];
    card.scoreAnswer = cardStrategies.ScoreAnswerStrategy[card.scoreAnswerStrategy];

    card = this.addOptionsAndModifyAnswer_(card);

    this.previousCardCache_[deckIndex][cardIndex] = card;
    return card;
  }

  createSaveData() {
    return {
      deckUniqueIds: this.decks_.map(deck => deck.uniqueId),
      numberOfOptionsForDeck: this.decks_.map(deck => deck.numberOfOptions),
      indexSet: this.indexSet_,
      name: this.getName(),
      article: this.getArticle(),
      nextCardId: this.nextCardId_,
      previousCardCache: this.purgeCache_(),
    };
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

  addOptionsAndModifyAnswer_(card) {
    if (!card.numberOfOptions || card.options) {
      return card;
    }
    let numberOfOptions = card.numberOfOptions;
    let correctAnswer = card.answer[0];
    let options = [correctAnswer];

    let loopCounter = 0;
    while (options.length < numberOfOptions) {
      let randomDeckIndex = Math.floor(Math.random() * this.decks_.length);
      let randomDeck = this.decks_[randomDeckIndex];
      let randomCardIndex = Math.floor(Math.random() * randomDeck.cards.length);
      let randomCard = randomDeck.cards[randomCardIndex];

      if (randomCard) {
        let randomAnswer = randomCard.answer[0];
        if (options.indexOf(randomAnswer) === -1) {
          options.push(randomAnswer);
        }
      }

      ++loopCounter;
      if (loopCounter > 10000) {
        logger.logFailure(LOGGER_TITLE, `Couldn't generate enough options. Weird`);
        break;
      }
    }

    card.options = Util.shuffleArray(options);
    let correctOptionIndex = card.options.indexOf(correctAnswer);
    assert(correctOptionIndex !== -1, 'No correct option?');

    let correctOptionCharacter = '' + (correctOptionIndex + 1);
    card.answer.unshift(correctOptionCharacter);

    return card;
  }

  purgeCache_() {
    for (let cardMap of this.previousCardCache_) {
      for (let cardIndex of Object.keys(cardMap)) {
        if (cardMap[cardIndex].discarded) {
          delete cardMap[cardIndex];
        }
      }
    }
    return this.previousCardCache_;
  }

  recycleCard(card, gameMode) {
    let recycled = gameMode.recycleCard(card, this.indexSet_[card.deckIndex], this.decks_.length);
    if (!recycled) {
      card.discarded = true;
    }
  }
}

module.exports = DeckCollection;
