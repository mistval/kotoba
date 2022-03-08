const assert = require('assert');
const startSequences = require('./shiritori_word_starting_sequences.js');
const convertToHiragana = require('./../convert_to_hiragana.js');
const lengthenerForChar = require('./../hiragana_lengtheners.js');
const dakutenVariants = require('./../dakuten_variants.js');

const REJECTION_REASON = {
  UnknownWord: 'Unknown word',
  ReadingAlreadyUsed: 'Reading already used',
  ReadingEndsWithN: 'Reading ends with N',
  WrongStartSequence: 'Does not start with the right characters',
  NotNoun: 'Not a noun',
  BotBanned: 'Bot not allowed to use that word',
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

function getNextWordMustStartWith(settings, currentWordReading) {
  const finalCharacter = currentWordReading[currentWordReading.length - 1];
  let secondLastCharacter = undefined;
  let wordHead = currentWordReading.substring(0, currentWordReading.length - 1);

  if(currentWordReading.length >= 2) {
    secondLastCharacter = currentWordReading[currentWordReading.length - 2];
  }

  if(settings.laxLongVowels && lengthenerForChar[secondLastCharacter] == finalCharacter) {
    let dupSettings = { ...settings };
    dupSettings.laxLongVowels = false;  // Don't use lax long vowels twice.

    // Get the normal "next word must start with" for both the last and second-last character
    return getNextWordMustStartWith(dupSettings, currentWordReading).concat(
      getNextWordMustStartWith(dupSettings, wordHead)
    );
  }

  if(settings.smallLetters && largeHiraganaForSmallHiragana[finalCharacter]) {
    let dupSettings = { ...settings };
    dupSettings.smallLetters = false;

    return [largeHiraganaForSmallHiragana[finalCharacter]].concat(
      getNextWordMustStartWith(dupSettings, currentWordReading)
    );
  }

  if(largeHiraganaForSmallHiragana[finalCharacter]) {
    prevLetter = currentWordReading.substring(currentWordReading.length - 2, currentWordReading.length - 1);
    let accept = [];

    // We want to accept じゃ after くちぢゃ.
    let prefixAccept = getNextWordMustStartWith(settings, prevLetter);
    for(word of prefixAccept) {
      accept.push(word + finalCharacter);
    }

    return accept;
  }

  // This check must happen after the long vowels check in order to process じょう properly into じょ、しょ、う、ゔ
  // It must happen after the small letters check to process しょ correctly into じょ、しょ
  if(settings.laxDakuten) {
    let dupSettings = { ...settings };
    dupSettings.laxDakuten = false;

    return getNextWordMustStartWith(dupSettings, currentWordReading).concat(dakutenVariants[finalCharacter]);
  }

  if (finalCharacter === 'ぢ') {
    return ['じ', 'ぢ'];
  } else if (finalCharacter === 'づ') {
    return ['ず', 'づ'];
  } else if (finalCharacter === 'を') {
    return ['お', 'を'];
  } else if (finalCharacter === 'っ') {
    return ['つ', 'っ'];
  }

  return [finalCharacter];
}

class WordInformation {
  constructor(settings, word, reading, meaning) {
    this.word = word;
    this.reading = reading;
    this.meaning = meaning;
    this.nextWordMustStartWith = getNextWordMustStartWith(settings, this.reading);
    this.uri = `https://jisho.org/search/${encodeURIComponent(this.word)}`;
  }
}

class AcceptedResult {
  constructor(settings, word, reading, meaning, score) {
    this.accepted = true;
    this.score = score;
    this.word = new WordInformation(settings, word, reading, meaning);
  }
}

class RejectedResult {
  constructor(reason, extraData) {
    this.accepted = false;
    this.rejectionReason = reason;
    this.extraData = extraData;
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

class JapaneseGameStrategy {
  constructor(resourceDatabase) {
    this.resourceDatabase = resourceDatabase;
  }

  async tryAcceptAnswer(settings, answer, wordInformationsHistory, isBot) {
    const hiragana = convertToHiragana(answer);
    const possibleWordInformations = this.resourceDatabase.getShiritoriWords(hiragana);

    if (!possibleWordInformations || possibleWordInformations.length === 0) {
      return new RejectedResult(REJECTION_REASON.UnknownWord);
    }

    let nextWordStartSequences;
    if (wordInformationsHistory.length > 0) {
      const previousWordInformation = wordInformationsHistory[wordInformationsHistory.length - 1];
      nextWordStartSequences = previousWordInformation.nextWordMustStartWith;
    }

    const alreadyUsedReadings = [];
    const readingsEndingWithN = [];
    const readingsStartingWithWrongSequence = [];
    const noNounReadings = [];
    let readingToUse;
    let answerToUse;
    let meaningToUse;
    let botBanned = false;
    for (let i = 0; i < possibleWordInformations.length; i += 1) {
      const possibleWordInformation = possibleWordInformations[i];
      const { reading } = possibleWordInformation;
      const alreadyUsed = readingAlreadyUsed(reading, wordInformationsHistory);
      if (
        nextWordStartSequences
        && !nextWordStartSequences.some(sequence => reading.startsWith(sequence))
      ) {
        pushUnique(readingsStartingWithWrongSequence, reading);
      } else if (reading.endsWith('ん')) {
        pushUnique(readingsEndingWithN, reading);
      } else if (alreadyUsed) {
        pushUnique(alreadyUsedReadings, reading);
      } else if (!possibleWordInformation.isNoun) {
        pushUnique(noNounReadings, reading);
      } else if (isBot && possibleWordInformation.botBanned) {
        botBanned = true;
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
      return new AcceptedResult(settings, answerToUse, readingToUse, meaningToUse, readingToUse.length);
    }

    if (alreadyUsedReadings.length > 0) {
      return new RejectedResult(REJECTION_REASON.ReadingAlreadyUsed, alreadyUsedReadings);
    } if (readingsEndingWithN.length > 0) {
      return new RejectedResult(REJECTION_REASON.ReadingEndsWithN, readingsEndingWithN);
    } if (readingsStartingWithWrongSequence.length > 0) {
      return new RejectedResult(
        REJECTION_REASON.WrongStartSequence,
        {
          expected: nextWordStartSequences,
          actual: readingsStartingWithWrongSequence,
        },
      );
    } if (noNounReadings.length > 0) {
      return new RejectedResult(REJECTION_REASON.NotNoun, noNounReadings);
    } if (botBanned) {
      return new RejectedResult(REJECTION_REASON.BotBanned);
    }

    assert(false, 'Unexpected branch');
    return undefined;
  }

  async getViableNextResult(settings, wordInformationsHistory) {
    let startSequence;
    if (wordInformationsHistory.length > 0) {
      const previousWordInformation = wordInformationsHistory[wordInformationsHistory.length - 1];
      ([startSequence] = previousWordInformation.nextWordMustStartWith);
    } else {
      startSequence = getRandomArrayElement(startSequences);
    }

    const readingsForStartSequence = require('./readings_for_start_sequence.json');
    const possibleNextReadings = readingsForStartSequence[startSequence];
    assert(possibleNextReadings, `No next readings for ${startSequence}`);

    // Cube it in order to prefer more common words.
    const cubeRandom = Math.random() * Math.random() * Math.random();
    let nextReadingIndex = Math.floor(cubeRandom * possibleNextReadings.length);
    const firstReadingTestedIndex = nextReadingIndex;

    // Find a word that is usable and return it.
    while (true) {
      const nextReading = possibleNextReadings[nextReadingIndex];
      const result = await this.tryAcceptAnswer(settings, nextReading, wordInformationsHistory, true);
      if (result.accepted) {
        return result;
      }

      nextReadingIndex += 1;
      if (nextReadingIndex === possibleNextReadings.length) {
        // Wrap around to the start of the array
        nextReadingIndex = 0;
      }

      if (nextReadingIndex === firstReadingTestedIndex) {
        // We came full circle. Couldn't find a viable next word.
        // Should be extremely unlikely to happen as a game would need
        // to continue for a very long time for us to run out of usable
        // words
        throw new Error(`Could not find a viable next word for start sequence: ${startSequence}`);
      }
    }
  }
}

module.exports = JapaneseGameStrategy;
module.exports.REJECTION_REASON = REJECTION_REASON;
