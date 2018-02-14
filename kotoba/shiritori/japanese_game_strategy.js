const reload = require('require-reload')(require);
const wordData = reload('./shiritori_word_data.js');
const logger = reload('monochrome-bot').logger;

const largeHirganaForSmallHirgana = {
  'ゃ': 'や',
  'ゅ': 'ゆ',
  'ょ': 'よ',
};

function getNextWordMustStartWith(currentWordReading) {
  let finalCharacter = currentWordReading[currentWordReading.length - 1];
  if (!largeHirganaForSmallHirgana[finalCharacter]) {
    return [finalCharacter];
  }

  return [largeHirganaForSmallHirgana[finalCharacter], currentWordReading[currentWordReading.length - 2] + currentWordReading[currentWordReading.length - 1]];
}

class WordInformation {
  constructor(word, reading) {
    this.word = word;
    this.reading = reading;
    this.nextWordMustStartWith = getNextWordMustStartWith(this.reading);
  }
}

function getRandomArrayElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getFirstReadingOfWord(word) {
  if (wordData.readingsForWord[word] && wordData.readingsForWord[word].length > 0) {
    return wordData.readingsForWord[word][0];
  }
  return word;
}

function getRandomWordInformation() {
  let startSequences = Object.keys(wordData.wordsForStartSequence);
  let startSequence = getRandomArrayElement(startSequences);
  let words = wordData.wordsForStartSequence[startSequence];
  let word = getRandomArrayElement(words);
  let reading = getFirstReadingOfWord(word);
  return new WordInformation(word, reading);
}

function getNextWordStartSequence(previousWordReading) {
  let previousWordFinalCharacter = previousWordReading[previousWordReading.length - 1];

  if (largeHirganaForSmallHirgana[previousWordFinalCharacter]) {
    return largeHirganaForSmallHirgana[previousWordFinalCharacter];
  } else {
    return previousWordFinalCharacter;
  }
}

function readingAlreadyUsed(reading, wordInformationsHistory) {
  return wordInformationsHistory.some(wordInformation => wordInformation.reading === reading);
}

function getViableWordStartingWith(nextWordStartSequence, wordInformationsHistory) {
  let possibleNextWords = wordData.wordsForStartSequence[nextWordStartSequence];

  // Cube it in order to prefer more common words.
  let nextWordIndex = Math.floor(Math.random() * Math.random() * Math.random() * possibleNextWords.length);
  let firstWordTestedIndex = nextWordIndex;

  // Find a word that has an unused reading and return it.
  while (true) {
    let nextWord = possibleNextWords[nextWordIndex];
    let wordReadings = wordData.readingsForWord[nextWord];
    for (let reading of wordReadings) {
      if (!readingAlreadyUsed(reading, wordInformationsHistory)) {
        return new WordInformation(nextWord, reading);
      }
    }

    ++nextWordIndex;
    if (nextWordIndex === possibleNextWords.length) {
      // Wrap around to the start of the array
      nextWordIndex = 0;
    }
    if (nextWordIndex === firstWordTestedIndex) {
      // We came full circle. This is perfectly possible in theory, but I doubt anyone will ever play a game long enough for it to happen, so just throw.
      throw new Error('Couldn\t get a viable next word');
    }
  }
}

class JapaneseStrategy {
  getViableNextWord(wordInformationsHistory) {
    let previousWordInformation = wordInformationsHistory[wordInformationsHistory.length - 1];
    if (!previousWordInformation) {
      return getRandomWordInformation();
    }

    let previousWordReading = previousWordInformation.previousWordReading;
    let nextWordStartSequence = getNextWordStartSequence(previousWordReading);
    return getViableWordStartingWith(nextWordStartSequence, wordInformationsHistory);
  }
}

module.exports = JapaneseStrategy;
