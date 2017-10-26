'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const assert = require('assert');
const logger = require('./../core/logger.js');
const renderText = reload('./render_text.js');
const fs = require('fs');
const constants = require('./constants.js');
const LOGGER_TITLE = 'QUIZ';

class JapaneseDeckStrategy {
  completeQuestionInfoForNewQuestion(questionInfo, card, name, instructions) {
    questionInfo.correctAnswers = card.answer;
    if (!KotobaUtils.isNonEmptyArray(questionInfo.correctAnswers)) {
      questionInfo.correctAnswers = [questionInfo.correctAnswers];
    }
    questionInfo.memento.strategyMemento = {
      question: card.question,
      answers: questionInfo.correctAnswers,
    };
    if (card.meaning) {
      questionInfo.memento.strategyMemento.meanings = card.meaning.split(',').join(', ');
    }

    return renderText(card.question).then(buffer => {
      let attachment = {file: buffer, name: 'upload.png'};
      let content = {};
      content.embed = {
        title: name,
        image: {url: 'attachment://upload.png'},
        description: instructions,
        color: constants.EMBED_NEUTRAL_COLOR,
      };

      questionInfo.content = content;
      questionInfo.attachment = attachment;
      return questionInfo;
    });
  }

  createUnansweredQuestionsEntry(memento) {
    return memento.strategyMemento.question + ' (' + memento.strategyMemento.answers.join(', ') + ')';
  }

  getUpdatedQuestionInfo(questionInfo) {
    return;
  }

  getQuizNameForMultipleDecks() {
    return 'Japanese Reading Quiz';
  }

  getArticleForMultipleDecks() {
    return 'a';
  }

  getDefaultTimeLimit() {
    return 20;
  }

  createQuizEndUriForUnansweredMementos(unansweredMementos) {
    let uri = 'http://jisho.org/search/';
    for (let i = 0; i < unansweredMementos.length && i < 20; ++i) {
      uri += encodeURIComponent(unansweredMementos[i].strategyMemento.question + ',');
    }
    return uri;
  }

  createAdditionalFieldsForAnswer(memento) {
    if (memento.strategyMemento.meanings) {
      return {name: 'Meaning', value: memento.strategyMemento.meanings};
    }
  }

  createDictionaryLinkForAnswer(memento) {
    return 'http://jisho.org/search/' + encodeURIComponent(memento.strategyMemento.question);
  }
}

class EnglishDeckStrategy {
  createUnansweredQuestionsEntry(memento) {
    return memento.strategyMemento.answer;
  }

  completeQuestionInfoForNewQuestion(questionInfo, card, name, instructions) {
    questionInfo.updateQuestionIntervalInMs = 7000;
    questionInfo.correctAnswers = [card.answer];
    let hintString = this.getHintString_(card.answer, '', 0);
    let strategyMemento = {
      question: card.question,
      answer: card.answer,
      strategy: this,
      hintString: hintString,
      timesUpdated: 1,
    };
    questionInfo.memento.strategyMemento = strategyMemento;

    questionInfo.content = {};
    questionInfo.content.embed = {
      title: name,
      description: strategyMemento.question,
      footer: {text: hintString},
      color: constants.EMBED_NEUTRAL_COLOR,
    };

    return Promise.resolve(questionInfo);
  }

  getUpdatedQuestionInfo(questionInfo) {
    let strategyMemento = questionInfo.memento.strategyMemento;
    let newHintString = this.getHintString_(
      strategyMemento.answer,
      strategyMemento.hintString,
      strategyMemento.timesUpdated);
    if (!newHintString) {
      return;
    }
    strategyMemento.hintString = newHintString;
    ++strategyMemento.timesUpdated;
    questionInfo.content.embed.footer.text = newHintString;
    return questionInfo;
  }

  getHintString_(answer, oldHintString, timesUpdated) {
    let answerLength = answer.length;
    if (timesUpdated === 0) {
      return Array(answerLength + 1).join('_ ');
    }
    if (timesUpdated > 2) {
      return;
    }
    if (timesUpdated + 1 > answer.length) {
      return;
    }
    let unrevealedIndices = [];
    for (let i = 0; i < oldHintString.length; ++i) {
      if (oldHintString[i] === '_') {
        unrevealedIndices.push(i);
      }
    }

    let numberOfIndicesToReveal = Math.ceil(answerLength * .2);
    let newHintCharArray = oldHintString.split('');
    for (let i = 0; i < numberOfIndicesToReveal; ++i) {
      let nextIndexIndex = Math.floor(Math.random() * unrevealedIndices.length);
      let nextIndex = unrevealedIndices.splice(nextIndexIndex, 1);
      newHintCharArray[nextIndex] = answer[nextIndex / 2];
    }

    return newHintCharArray.join('');
  }

  getQuizNameForMultipleDecks() {
    return 'English Vocabulary Quiz';
  }

  getArticleForMultipleDecks() {
    return 'an';
  }

  getDefaultTimeLimit() {
    return 27;
  }

  createQuizEndUriForUnansweredMementos(unansweredMementos) {
    return;
  }

  createAdditionalFieldsForAnswer(memento) {
    return;
  }

  createDictionaryLinkForAnswer(memento) {
    return 'https://www.merriam-webster.com/dictionary/' + encodeURIComponent(memento.strategyMemento.answer);
  }
}

let uniqueIds = [];
let japaneseDeckForName = {};
let englishDeckForName = {};
getDecksInDirectory(japaneseDeckForName, '/carddecks/japanese/', new JapaneseDeckStrategy());
getDecksInDirectory(englishDeckForName, '/carddecks/english/', new EnglishDeckStrategy());

function getDecksInDirectory(dictionaryToFill, directory, strategy) {
  fs.readdir(__dirname + directory, (err, files) => {
    if (err) {
      return logger.logFailure(LOGGER_TITLE, 'Error loading decks. Error reading directory.', err);
    }
    if (!files) {
      return logger.logFailure(LOGGER_TITLE, 'Error loading decks. No files in directory: ' + directory);
    }
    for (let name of files) {
      if (name.endsWith('.json')) {
        try {
          let baseName = name.replace(/\.json$/, '');
          let deckData = reload('.' + directory + name);
          let deck = new Deck(deckData, strategy);
          dictionaryToFill[baseName.toLowerCase()] = deck;
          assert(uniqueIds.indexOf(deck.uniqueId) === -1, 'Duplicate uniqueids ');
          uniqueIds.push(deck.uniqueId);
        } catch (err) {
          logger.logFailure(LOGGER_TITLE, 'Error loading deck ' + name, err);
        }
      }
    }
  });
}

class Deck {
  constructor(deckData, strategy) {
    this.uniqueId = deckData.uniqueId;
    this.showDictionaryLink = deckData.showDictionaryLink;
    this.name = deckData.name;
    this.category = deckData.category;
    this.article = deckData.article;
    this.instructions = deckData.instructions;
    this.cards = deckData.cards.slice(0);
    this.strategy = strategy;
  }

  copy() {
    return new Deck(this, this.strategy);
  }
}

class DeckCollection {
  constructor(decks) {
    this.decks = decks;
    this.cardCount = 0;
    for (let deck of decks) {
      this.cardCount += deck.cards.length;
    }
  }

  getNewQuestionInfo() {
    if (this.cardCount === 0) {
      return Promise.resolve(undefined);
    }
    let cardIndex = Math.floor(Math.random() * this.cardCount);
    for (let deck of this.decks) {
      if (cardIndex < deck.cards.length) {
        let card = deck.cards.splice(cardIndex, 1)[0];
        --this.cardCount;
        let deckCollectionMemento = {
          showDictionaryLink: deck.showDictionaryLink,
          strategy: deck.strategy,
        };
        let questionInfo = {
          memento: {
            deckCollectionMemento: deckCollectionMemento,
          },
        };
        return deck.strategy.completeQuestionInfoForNewQuestion(questionInfo, card, deck.name, deck.instructions);
      }
      cardIndex -= deck.cards.length;
    }

    assert('Should have returned by now.');
  }

  getUpdatedQuestionInfo(questionInfo) {
    return questionInfo.memento.deckCollectionMemento.strategy.getUpdatedQuestionInfo(questionInfo);
  }

  getDeckUniqueId() {
    if (this.decks.length === 1) {
      return this.decks[0].uniqueId;
    } else {
      return -1;
    }
  }

  getDeckName() {
    if (this.decks.length === 1) {
      return this.decks[0].name;
    } else if (this.allDecksHaveSameStrategy()) {
      return this.decks[0].strategy.getQuizNameForMultipleDecks();
    } else {
      return 'Multiple Deck Quiz';
    }
  }

  getDeckArticle() {
    if (this.decks.length === 1) {
      return this.decks[0].article;
    } else if (this.allDecksHaveSameStrategy()) {
      return this.decks[0].strategy.getArticleForMultipleDecks();
    } else {
      return 'a';
    }
  }

  allDecksHaveSameStrategy() {
    let strategy = this.decks[0].strategy;
    return this.decks.every(deck => {
      return deck.strategy === strategy;
    });
  }

  createUnansweredQuestionsField(unansweredMementos) {
    let results = '';
    for (let i = 0; i < unansweredMementos.length && i < 20; ++i) {
      let memento = unansweredMementos[i];
      results += memento.deckCollectionMemento.strategy.createUnansweredQuestionsEntry(memento);
      results += '\n';
    }

    if (unansweredMementos.length > 20) {
      results += '(truncated...)';
    }

    return results;
  }

  createUriForQuizEnd(unansweredMementos) {
    let mementoForDictionaryLink = unansweredMementos.find(memento => {
      return memento.deckCollectionMemento.showDictionaryLink;
    });
    if (!mementoForDictionaryLink) {
      return;
    }
    let mementosWithMatchingStrategy = unansweredMementos.filter(memento => {
      return memento.deckCollectionMemento.strategy === mementoForDictionaryLink.deckCollectionMemento.strategy;
    });
    return mementoForDictionaryLink.deckCollectionMemento.strategy.createQuizEndUriForUnansweredMementos(mementosWithMatchingStrategy);
  }

  getDefaultTimeLimit() {
    if (this.allDecksHaveSameStrategy()) {
      return this.decks[0].strategy.getDefaultTimeLimit();
    } else {
      let max = 0;
      for (let deck of this.decks) {
        max = Math.max(max, deck.strategy.getDefaultTimeLimit());
      }
      return max;
    }
  }

  createAdditionalFieldsForAnswer(memento) {
    return memento.deckCollectionMemento.strategy.createAdditionalFieldsForAnswer(memento);
  }

  createUriForAnswer(memento) {
    if (memento.deckCollectionMemento.showDictionaryLink) {
      return memento.deckCollectionMemento.strategy.createDictionaryLinkForAnswer(memento);
    }
  }
}

class Quiz {
  constructor(suffix) {
    suffix = suffix.toLowerCase();
    suffix = suffix.replace('jlpt ', '');
    let suffixParts = suffix.split(' ');
    let deckArg = suffixParts[0];
    let deckNames = deckArg.split('+');
    deckNames = deckNames.filter((deckName, position) => {
      return deckNames.indexOf(deckName) === position;
    });

    let decks = [];
    for (let deckName of deckNames) {
      if (japaneseDeckForName[deckName]) {
        decks.push(japaneseDeckForName[deckName].copy());
      } else if (englishDeckForName[deckName]) {
        decks.push(englishDeckForName[deckName].copy());
      } else {
        this.loaded = false;
        this.unloadedDeckName = deckName;
        return;
      }
    }

    this.deckCollection = new DeckCollection(decks);

    this.name = this.deckCollection.getDeckName();
    this.article = this.deckCollection.getDeckArticle();
    this.deckid = this.deckCollection.getDeckUniqueId();

    this.correctAnswerLimit = suffixParts[1];
    if (this.correctAnswerLimit) {
      this.correctAnswerLimit = parseInt(this.correctAnswerLimit);
      this.correctAnswerLimit = Math.max(this.correctAnswerLimit, 1);
      this.correctAnswerLimit = Math.min(this.correctAnswerLimit, 1000000);
    } else {
      this.correctAnswerLimit = 10;
    }

    this.nextWordDelayInMs = suffixParts[2];
    if (this.nextWordDelayInMs) {
      this.nextWordDelayInMs = parseFloat(this.nextWordDelayInMs);
      this.nextWordDelayInMs = Math.max(this.nextWordDelayInMs, 0);
      this.nextWordDelayInMs = Math.min(this.nextWordDelayInMs, 20);
    } else {
      this.nextWordDelayInMs = 4;
    }

    this.timeLimitInMs = suffixParts[3];
    if (this.timeLimitInMs) {
      this.timeLimitInMs = parseFloat(this.timeLimitInMs);
      this.timeLimitInMs = Math.max(this.timeLimitInMs, 3);
      this.timeLimitInMs = Math.min(this.timeLimitInMs, 30);
    } else {
      this.timeLimitInMs = this.deckCollection.getDefaultTimeLimit();
    }

    this.incorrectAnswerLimit = 5;
    this.loaded = true;
  }

  createAdditionalFieldsForAnswer(memento) {
    return this.deckCollection.createAdditionalFieldsForAnswer(memento);
  }

  createFooterForAnswer(memento) {
    return;
  }

  createUnansweredQuestionsField(unansweredMementos) {
    return this.deckCollection.createUnansweredQuestionsField(unansweredMementos);
  }

  createUriForQuizEnd(unansweredMementos) {
    return this.deckCollection.createUriForQuizEnd(unansweredMementos);
  }

  createUriForAnswer(memento) {
    return this.deckCollection.createUriForAnswer(memento);
  }

  getUpdatedQuestionInfo(questionInfo) {
    return this.deckCollection.getUpdatedQuestionInfo(questionInfo);
  }

  getNewQuestionInfo() {
    return this.deckCollection.getNewQuestionInfo();
  }
}

module.exports = Quiz;
