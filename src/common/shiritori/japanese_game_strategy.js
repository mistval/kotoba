const reload = require('require-reload')(require);
const globals = require('./../globals.js');
const assert = require('assert');

const wordData = reload('./shiritori_word_data.js');
const convertToHiragana = reload('./../util/convert_to_hiragana');

const REJECTION_REASON = {
  UnknownWord: 1,
  ReadingAlreadyUsed: 2,
  ReadingEndsWithN: 3,
  WrongStartSequence: 4,
  NotNoun: 5,
};

const largeHiraganaForSmallHiragana = {
  ゃ: 'や',
  ゅ: 'ゆ',
  ょ: 'よ',
  ぁ: 'あ',
  ぃ: 'い',
  ぅ: 'う',
  ぇ: 'え',
  ぉ: 'お',
};

function getNextWordMustStartWith(currentWordReading) {
  const finalCharacter = currentWordReading[currentWordReading.length - 1];
  if (finalCharacter === 'ぢ') {
    return ['じ', 'ぢ'];
  } else if (finalCharacter === 'づ') {
    return ['ず', 'づ'];
  } else if (finalCharacter === 'を') {
    return ['お', 'を'];
  } else if (!largeHiraganaForSmallHiragana[finalCharacter]) {
    return [finalCharacter];
  }
  return [
    largeHiraganaForSmallHiragana[finalCharacter],
    currentWordReading.substring(currentWordReading.length - 2, currentWordReading.length),
  ];
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
  constructor(reason, rejectedInput, extraData) {
    this.accepted = false;
    this.rejectionReason = reason;
    this.extraData = extraData;
    this.rejectedInput = rejectedInput;
  }
}

function getRandomArrayElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function readingAlreadyUsed(reading, wordInformationsHistory) {
  return wordInformationsHistory.some(wordInformation => wordInformation.reading === reading);
}

function pushUnique(array, element) {
  if (array.indexOf(element) === -1) {
    array.push(element);
  }
}

function tryAcceptAnswer(answer, wordInformationsHistory) {
  const hiragana = convertToHiragana(answer);
  const possibleWordInformations =
    wordData.getWordInformationsForWordAsHirgana(hiragana);

  if (!possibleWordInformations || possibleWordInformations.length === 0) {
    return new RejectedResult(REJECTION_REASON.UnknownWord, answer);
  }

  let startSequences;
  if (wordInformationsHistory.length > 0) {
    startSequences =
      wordInformationsHistory[wordInformationsHistory.length - 1].nextWordMustStartWith;
  }

  const alreadyUsedReadings = [];
  const readingsEndingWithN = [];
  const readingsStartingWithWrongSequence = [];
  const noNounReadings = [];
  let readingToUse;
  let answerToUse;
  let meaningToUse;
  for (let i = 0; i < possibleWordInformations.length; i += 1) {
    const possibleWordInformation = possibleWordInformations[i];
    const { reading } = possibleWordInformation;
    const alreadyUsed = readingAlreadyUsed(reading, wordInformationsHistory);
    if (startSequences && !startSequences.some(sequence => reading.startsWith(sequence))) {
      pushUnique(readingsStartingWithWrongSequence, reading);
    } else if (reading.endsWith('ん')) {
      pushUnique(readingsEndingWithN, reading);
    } else if (alreadyUsed) {
      pushUnique(alreadyUsedReadings, reading);
    } else if (!possibleWordInformation.isNoun) {
      pushUnique(noNounReadings, reading);
    } else {
      readingToUse = reading;
      answerToUse = possibleWordInformation.word;
      if (possibleWordInformation.definitions) {
        meaningToUse = possibleWordInformation.definitions.join(', ');
      }
      break;
    }
  }

  if (answerToUse) {
    return new AcceptedResult(answerToUse, readingToUse, meaningToUse, readingToUse.length);
  }

  if (alreadyUsedReadings.length > 0) {
    return new RejectedResult(REJECTION_REASON.ReadingAlreadyUsed, answer, alreadyUsedReadings);
  } else if (readingsEndingWithN.length > 0) {
    return new RejectedResult(REJECTION_REASON.ReadingEndsWithN, answer, readingsEndingWithN);
  } else if (readingsStartingWithWrongSequence.length > 0) {
    return new RejectedResult(
      REJECTION_REASON.WrongStartSequence,
      answer,
      {
        expected: startSequences,
        actual: readingsStartingWithWrongSequence
      }
    );
  } else if (noNounReadings.length > 0) {
    return new RejectedResult(REJECTION_REASON.NotNoun, answer, noNounReadings);
  } else {
    assert(false, 'Unexpected branch');
  }
}

function getViableNextResult(wordInformationsHistory, retriesLeft, forceRandomStartSequence) {
  if (retriesLeft === 0) {
    throw new Error('Couldn\'t get a viable next word :/');
  }

  let startSequence;
  if (
    !wordInformationsHistory
    || wordInformationsHistory.length === 0
    || forceRandomStartSequence
  ) {
    const startSequences = Object.keys(wordData.wordsForStartSequence);
    startSequence = getRandomArrayElement(startSequences);
  } else {
    ([startSequence] =
      wordInformationsHistory[wordInformationsHistory.length - 1].nextWordMustStartWith);
  }

  const possibleNextWords = wordData.wordsForStartSequence[startSequence];

  if (!possibleNextWords) {
    globals.logger.logFailure('SHIRITORI', `!\n!\n!\n!\n!\n!\n!\n!\n!\n!\nInvalid start sequence ${startSequence}`);
    return getViableNextResult(wordInformationsHistory, retriesLeft, true);
  }

  // Cube it in order to prefer more common words.
  let nextWordIndex =
    Math.floor(Math.random() * Math.random() * Math.random() * possibleNextWords.length);
  const firstWordTestedIndex = nextWordIndex;

  // Find a word that is usable and return it.
  while (true) {
    const nextWord = possibleNextWords[nextWordIndex];
    const result = tryAcceptAnswer(nextWord, wordInformationsHistory);
    if (result.accepted) {
      return result;
    }

    nextWordIndex += 1;
    if (nextWordIndex === possibleNextWords.length) {
      // Wrap around to the start of the array
      nextWordIndex = 0;
    }
    if (nextWordIndex === firstWordTestedIndex) {
      // We came full circle. Try again.
      // Although possible, it is extremely unlikely that a game would continue
      // so long that there are no viable words left.
      return getViableNextResult(wordInformationsHistory, retriesLeft ? retriesLeft - 1 : 1000);
    }
  }
}

module.exports = {
  getViableNextResult,
  tryAcceptAnswer,
  REJECTION_REASON,
};
