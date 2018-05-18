'use strict'
const reload = require('require-reload')(require);
const wordList = reload('./../../resources/dictionaries/random_word_corpus.json');

const totalNumberOfWords = Object.keys(wordList).reduce((total, key) => total + wordList[key].length, 0);
const wordTypes = Object.keys(wordList);

function getRandomWordFromAll() {
  let wordIndex = Math.floor(Math.random() * totalNumberOfWords);
  let wordTypeIndex = 0;
  let nextArray = wordList[wordTypes[wordTypeIndex]];
  while (nextArray.length <= wordIndex) {
    wordIndex -= nextArray.length;
    nextArray = wordList[wordTypes[++wordTypeIndex]];
  }

  return nextArray[wordIndex];
}

function getRandomWordFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

module.exports = function(wordType) {
  if (wordList[wordType]) {
    return getRandomWordFromArray(wordList[wordType]);
  }
  return getRandomWordFromAll();
}
