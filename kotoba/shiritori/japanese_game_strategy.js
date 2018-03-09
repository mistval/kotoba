const reload = require('require-reload')(require);
const wordData = reload('./shiritori_word_data.js');
const logger = reload('monochrome-bot').logger;
const convertToHiragana = reload('./../util/convert_to_hiragana');

const largeHiraganaForSmallHiragana = {
  'ゃ': 'や',
  'ゅ': 'ゆ',
  'ょ': 'よ',
  'ぃ': 'い',
};

function getNextWordMustStartWith(currentWordReading) {
  let finalCharacter = currentWordReading[currentWordReading.length - 1];
  if (finalCharacter === 'ぢ') {
    return ['じ', 'ぢ'];
  } else if (finalCharacter === 'づ') {
    return ['ず', 'づ'];
  } else if (!largeHiraganaForSmallHiragana[finalCharacter]) {
    return [finalCharacter];
  } else {
    return [largeHiraganaForSmallHiragana[finalCharacter], currentWordReading.substring(currentWordReading.length - 2, currentWordReading.length)];
  }
}

class WordInformation {
  constructor(word, reading, meaning) {
    this.word = word;
    this.reading = reading;
    this.meaning = meaning;
    this.nextWordMustStartWith = getNextWordMustStartWith(this.reading);
  }
}

class AcceptedResult {
  constructor(word, reading, meaning, score) {
    this.accepted = true;
    this.score = score;
    this.word = new WordInformation(word, reading, meaning);
  }
}

class RejectedResult {
  constructor(possiblyChat, reason) {
    this.accepted = false;
    this.possiblyChat = possiblyChat;
    this.rejectionReason = reason;
  }
}

function getRandomArrayElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getNextWordStartSequence(previousWordReading) {
  let previousWordFinalCharacter = previousWordReading[previousWordReading.length - 1];

  if (largeHiraganaForSmallHiragana[previousWordFinalCharacter]) {
    return largeHiraganaForSmallHiragana[previousWordFinalCharacter];
  } else {
    return previousWordFinalCharacter;
  }
}

function readingAlreadyUsed(reading, wordInformationsHistory) {
  return wordInformationsHistory.some(wordInformation => wordInformation.reading === reading);
}

function pushUnique(array, element) {
  if (array.indexOf(element) === -1) {
    array.push(element);
  }
}

function getPluralizer(array) {
  if (array.length > 1) {
    return 's';
  }
  return '';
}

function tryAcceptAnswer(answer, wordInformationsHistory) {
  let possibleWordInformations = wordData.wordInformationsForWordAsHiragana[convertToHiragana(answer)];

  if (!possibleWordInformations) {
    return new RejectedResult(true, `I don't know the word **${answer}**`);
  }

  let startSequences;
  if (wordInformationsHistory.length > 0) {
    startSequences = wordInformationsHistory[wordInformationsHistory.length - 1].nextWordMustStartWith;
  }

  let alreadyUsedReadings = [];
  let readingsEndingWithN = [];
  let readingsStartingWithWrongSequence = [];
  let noNounReadings = [];
  let readingToUse;
  let answerToUse;
  let meaningToUse;
  for (let possibleWordInformation of possibleWordInformations) {
    let reading = possibleWordInformation.reading;
    if (startSequences && !startSequences.some(sequence => reading.startsWith(sequence))) {
      pushUnique(readingsStartingWithWrongSequence, reading);
      continue;
    }
    if (reading.endsWith('ん')) {
      pushUnique(readingsEndingWithN, reading);
      continue;
    }
    let alreadyUsed = readingAlreadyUsed(reading, wordInformationsHistory);
    if (alreadyUsed) {
      pushUnique(alreadyUsedReadings, reading);
      continue;
    }
    if (!possibleWordInformation.definitions.some(definition => definition.isNoun)) {
      pushUnique(noNounReadings, reading);
      continue;
    }
    readingToUse = reading;
    answerToUse = possibleWordInformation.word;
    if (possibleWordInformation.definitions) {
      meaningToUse = possibleWordInformation.definitions.map(definition => definition.meaning).join(', ');
    }
    break;
  }

  if (answerToUse) {
    return new AcceptedResult(answerToUse, readingToUse, meaningToUse, readingToUse.length);
  }

  let ruleViolations = [];
  if (alreadyUsedReadings.length > 0) {
    ruleViolations.push(`Someone already used the reading${getPluralizer(alreadyUsedReadings)}: **${alreadyUsedReadings.join(', ')}**. The same reading can't be used twice in a game (even if the kanji is different!)`);
  }
  if (readingsEndingWithN.length > 0) {
    ruleViolations.push(`Words in Shiritori can't have readings that end with ん! (**${readingsEndingWithN.join(', ')}**)`);
  }
  if (readingsStartingWithWrongSequence.length > 0) {
    ruleViolations.push(`Your answer must begin with ${startSequences.join(', ')}. I found these readings for that word but they don't start with the right kana: **${readingsStartingWithWrongSequence.join(', ')}**`);
  }
  if (noNounReadings.length > 0) {
    ruleViolations.push(`Shiritori words must be nouns! I didn't find any nouns for the reading${getPluralizer(noNounReadings)}: **${noNounReadings.join(', ')}**`);
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
