const reload = require('require-reload')(require);
const wordData = reload('./shiritori_word_data.js');
const logger = reload('monochrome-bot').logger;
const convertToHiragana = reload('./../util/convert_to_hiragana');

const largeHiraganaForSmallHirgana = {
  'ゃ': 'や',
  'ゅ': 'ゆ',
  'ょ': 'よ',
};

function getNextWordMustStartWith(currentWordReading) {
  let finalCharacter = currentWordReading[currentWordReading.length - 1];
  if (!largeHiraganaForSmallHirgana[finalCharacter]) {
    return [finalCharacter];
  }

  return [largeHiraganaForSmallHirgana[finalCharacter], currentWordReading[currentWordReading.length - 2] + currentWordReading[currentWordReading.length - 1]];
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

function getNextWordStartSequence(previousWordReading) {
  let previousWordFinalCharacter = previousWordReading[previousWordReading.length - 1];

  if (largeHiraganaForSmallHirgana[previousWordFinalCharacter]) {
    return largeHiraganaForSmallHirgana[previousWordFinalCharacter];
  } else {
    return previousWordFinalCharacter;
  }
}

function readingAlreadyUsed(reading, wordInformationsHistory) {
  return wordInformationsHistory.some(wordInformation => wordInformation.reading === reading);
}

class AcceptedResult {
  constructor(word, reading) {
    this.accepted = true;
    this.word = new WordInformation(word, reading);
  }
}

class RejectedResult {
  constructor(silent, reason) {
    this.accepted = false;
    this.isSilent = silent;
    this.rejectionReason = reason;
  }
}

function tryAcceptAnswer(answer, wordInformationsHistory) {
  let possibleWordInformations = wordData.wordInformationsForWordAsHiragana[convertToHiragana(answer)];

  if (!possibleWordInformations) {
    return new RejectedResult(true);
  }

  let startSequences;
  if (wordInformationsHistory.length > 0) {
    startSequences = wordInformationsHistory[wordInformationsHistory.length - 1].nextWordMustStartWith;
  }

  let alreadyUsedReadings = [];
  let readingsEndingWithN = [];
  let readingsStartingWithWrongSequence = [];
  let readingToUse;
  let answerToUse;
  for (let possibleWordInformation of possibleWordInformations) {
    let reading = possibleWordInformation.reading;
    if (startSequences && !startSequences.some(sequence => reading.startsWith(sequence))) {
      readingsStartingWithWrongSequence.push(reading);
      continue;
    }
    if (reading.endsWith('ん')) {
      readingsEndingWithN.push(reading);
      continue;
    }
    let alreadyUsed = readingAlreadyUsed(reading, wordInformationsHistory);
    if (alreadyUsed) {
      alreadyUsedReadings.push(reading);
      continue;
    }
    readingToUse = reading;
    answerToUse = possibleWordInformation.word;
    break;
  }

  if (answerToUse) {
    return new AcceptedResult(answerToUse, readingToUse);
  }

  let ruleViolations = [];
  if (alreadyUsedReadings.length > 0) {
    let pluralizer = '';
    if (alreadyUsedReadings.length > 1) {
      pluralizer = 's';
    }
    ruleViolations.push(`Someone already used the reading${pluralizer}: **${alreadyUsedReadings.join(', ')}**. The same reading can't be used twice in a game (even if the kanji is different!)`);
  }
  if (readingsEndingWithN.length > 0) {
    ruleViolations.push(`Words in Shiritori can't have readings that end with ん! (${readingsEndingWithN.join(', ')})`);
  }
  if (readingsStartingWithWrongSequence.length > 0) {
    ruleViolations.push(`Your answer must begin with ${startSequences.join(', ')}. I found these readings for that word but they don't start with the right kana: ${readingsStartingWithWrongSequence.join(', ')}`);
  }

  let ruleViolation = ruleViolations.join('\n\n');
  return new RejectedResult(false, ruleViolation);
}

function getViableWord(wordInformationsHistory, retriesLeft) {
  if (retriesLeft === 0) {
    throw new Error('Couldn\'t get a viable next word :/');
  }

  let startSequence;
  if (!wordInformationsHistory || wordInformationsHistory.length === 0) {
    let startSequences = Object.keys(wordData.wordsForStartSequence);
    startSequence = getRandomArrayElement(startSequences);
  } else {
    startSequence = wordInformationsHistory[wordInformationsHistory.length - 1].nextWordMustStartWith[0];
  }

  let possibleNextWords = wordData.wordsForStartSequence[startSequence];

  // Cube it in order to prefer more common words.
  let nextWordIndex = Math.floor(Math.random() * Math.random() * Math.random() * possibleNextWords.length);
  let firstWordTestedIndex = nextWordIndex;

  // Find a word that is usable and return it.
  while (true) {
    let nextWord = possibleNextWords[nextWordIndex];
    let result = tryAcceptAnswer(nextWord, wordInformationsHistory);
    if (result.accepted) {
      return result.word;
    }

    ++nextWordIndex;
    if (nextWordIndex === possibleNextWords.length) {
      // Wrap around to the start of the array
      nextWordIndex = 0;
    }
    if (nextWordIndex === firstWordTestedIndex) {
      // We came full circle. Try again. Although possible, it is extremely unlikely that a game would continue so long that there are no viable words left.
      return getViableWord(wordInformationsHistory, retriesLeft ? retriesLeft - 1 : 1000);
    }
  }
}

class JapaneseStrategy {
  getViableNextWord(wordInformationsHistory) {
    return getViableWord(wordInformationsHistory);
  }

  tryAcceptAnswer(answer, wordInformationsHistory) {
    return tryAcceptAnswer(answer, wordInformationsHistory);
  }
}

module.exports = JapaneseStrategy;
