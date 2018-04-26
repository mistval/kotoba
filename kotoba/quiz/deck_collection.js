
const reload = require('require-reload')(require);

const Util = reload('./../utils.js');
const cardStrategies = reload('./card_strategies.js');
const deckLoader = reload('./deck_loader.js');
const assert = require('assert');

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function createRandomIndexSetForDecks(decks) {
  const indexSet = [];
  for (const deck of decks) {
    const startIndex = deck.startIndex || 0;
    const endIndex = deck.endIndex === undefined ? deck.cards.length - 1 : deck.endIndex;
    const indices = Array(endIndex - startIndex + 1);
    for (let i = startIndex; i <= endIndex; ++i) {
      indices[i - startIndex] = i;
    }

    indexSet.push(Util.shuffleArray(indices));
  }

  return indexSet;
}

class DeckCollection {
  static createNewFromDecks(decks, gameMode) {
    const deckCollection = new DeckCollection();
    deckCollection.nextCardId_ = 0;
    deckCollection.decks_ = decks;
    deckCollection.indexSet_ = createRandomIndexSetForDecks(decks);
    const deckName = deckCollection.decks_[0].name;
    if (deckCollection.decks_.every(deck => deck.name === deckName)) {
      deckCollection.name_ = deckName;
      deckCollection.description_ = decks[0].description;
    } else {
      deckCollection.name_ = 'Multiple Deck Quiz';
    }

    deckCollection.name_ = gameMode.overrideDeckTitle(deckCollection.name_);

    deckCollection.previousCardCache_ = [];
    for (const deck of decks) {
      deckCollection.previousCardCache_.push({});
    }

    return deckCollection;
  }

  static async createFromSaveData(saveData) {
    const deckQueries = saveData.deckUniqueIds.map((uniqueId, index) => {
      const numberOfOptions = saveData.numberOfOptionsForDeck ? saveData.numberOfOptionsForDeck[index] : 0;
      return { deckNameOrUniqueId: uniqueId, numberOfOptions };
    });

    const deckLookupStatus = await deckLoader.getQuizDecks(deckQueries);
    const deckCollection = new DeckCollection();
    deckCollection.decks_ = deckLookupStatus.decks;
    assert(deckCollection.decks_, 'couldn\'t find a save deck by unique ID');
    deckCollection.indexSet_ = saveData.indexSet;
    deckCollection.name_ = saveData.name;
    deckCollection.nextCardId_ = saveData.nextCardId;
    deckCollection.previousCardCache_ = saveData.previousCardCache;
    return deckCollection;
  }

  containsInternetCards() {
    return this.decks_.some(deck => deck.isInternetDeck);
  }

  getCachedPreviousCards() {
    const cards = [];
    for (const cachedDeck of this.previousCardCache_) {
      for (const cachedCard of Object.keys(cachedDeck).map(key => cachedDeck[key])) {
        cards.push(cachedCard);
      }
    }
    return cards;
  }

  isEmpty() {
    for (const array of this.indexSet_) {
      if (array.length > 0) {
        return false;
      }
    }
    return true;
  }

  getAllUndisplayedCards() {
    const undisplayedCards = [];
    for (let deckIndex = 0; deckIndex < this.indexSet_.length; ++deckIndex) {
      const deck = this.decks_[deckIndex];
      const unseenCardIndices = this.indexSet_[deckIndex];

      if (!deck.cards.memoryArray) {
        throw new Error('Trying to get all undisplayed cards from a non-memory deck. That\'s too expensive!');
      }

      for (const cardIndex of unseenCardIndices) {
        undisplayedCards.push(deck.cards.memoryArray[cardIndex]);
      }
    }

    return undisplayedCards;
  }

  async popUndisplayedCard(settings) {
    if (this.isEmpty()) {
      return;
    }

    const numDecksWithCardsLeft = this.indexSet_.reduce((numDecksWithCardsLeft, deck) => (deck.length > 0 ? numDecksWithCardsLeft + 1 : numDecksWithCardsLeft), 0);

    let deckWithCardsLeftIndex = Math.floor(Math.random() * numDecksWithCardsLeft);
    let deckIndex = 0;
    for (const array of this.indexSet_) {
      if (array.length > 0) {
        --deckWithCardsLeftIndex;
      }
      if (deckWithCardsLeftIndex === -1) {
        break;
      }
      ++deckIndex;
    }

    const cardIndex = this.indexSet_[deckIndex].pop();
    const deck = this.decks_[deckIndex];

    let card = this.previousCardCache_[deckIndex][cardIndex];
    if (!card) {
      const deckCard = await this.decks_[deckIndex].cards.get(cardIndex);
      if (!deckCard) {
        return this.popUndisplayedCard(settings);
      }
      card = deepCopy(deckCard);
    }

    if (!Array.isArray(card.answer)) {
      card.answer = [card.answer];
    }

    if (card.answer.length === 0 || card.answer[0] === '') {
      logger.logFailure(LOGGER_TITLE, `Card with no answer: ${card.question}`);
      return this.popUndisplayedCard(settings);
    }

    card.deckName = card.deckName || deck.name;
    card.deckId = card.deckId || deck.uniqueId;
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

    card = await this.addOptionsAndModifyAnswer_(card);

    this.previousCardCache_[deckIndex][cardIndex] = card;
    return card;
  }

  createSaveData() {
    return {
      deckUniqueIds: this.decks_.map(deck => deck.uniqueId),
      numberOfOptionsForDeck: this.decks_.map(deck => deck.numberOfOptions),
      indexSet: this.indexSet_,
      name: this.getName(),
      description: this.getDescription(),
      nextCardId: this.nextCardId_,
      previousCardCache: this.purgeCache_(),
    };
  }

  getName() {
    return this.name_;
  }

  getDescription() {
    return this.description_;
  }

  getDeckId() {
    if (this.decks_.length === 1) {
      return this.decks_[0].uniqueId;
    }
    return -1;
  }

  async addOptionsAndModifyAnswer_(card) {
    if (!card.numberOfOptions || card.options) {
      return card;
    }
    const numberOfOptions = card.numberOfOptions;
    const correctAnswer = card.answer[0];
    const options = [correctAnswer];

    let loopCounter = 0;
    while (options.length < numberOfOptions) {
      const randomDeckIndex = Math.floor(Math.random() * this.decks_.length);
      const randomDeck = this.decks_[randomDeckIndex];
      const randomCardIndex = Math.floor(Math.random() * randomDeck.cards.length);
      const randomCard = await randomDeck.cards.get(randomCardIndex);

      if (randomCard) {
        const randomAnswer = randomCard.answer[0];
        if (options.indexOf(randomAnswer) === -1) {
          options.push(randomAnswer);
        }
      }

      ++loopCounter;
      if (loopCounter > 10000) {
        logger.logFailure(LOGGER_TITLE, 'Couldn\'t generate enough options. Weird');
        break;
      }
    }

    card.options = Util.shuffleArray(options);
    const correctOptionIndex = card.options.indexOf(correctAnswer);
    assert(correctOptionIndex !== -1, 'No correct option?');

    const correctOptionCharacter = `${correctOptionIndex + 1}`;
    card.answer.unshift(correctOptionCharacter);

    return card;
  }

  purgeCache_() {
    for (const cardMap of this.previousCardCache_) {
      for (const cardIndex of Object.keys(cardMap)) {
        if (cardMap[cardIndex].discarded) {
          delete cardMap[cardIndex];
        }
      }
    }
    return this.previousCardCache_;
  }

  recycleCard(card, gameMode) {
    const recycled = gameMode.recycleCard(card, this.indexSet_[card.deckIndex], this.decks_.length);
    if (!recycled) {
      card.discarded = true;
    }
  }
}

module.exports = DeckCollection;
