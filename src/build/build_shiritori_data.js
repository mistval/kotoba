const wordStartingSequences = require('./shiritori_word_starting_sequences.js');
const convertToHiragana = require('./../kotoba/util/convert_to_hiragana.js');
const fs = require('fs');
const wordsByFrequency = require('./../kotoba/resources/dictionaries/frequency.json');
const path = require('path');

const partsOfSpeechPartRegex = /\((.*?)\)/;
const edictNounCodes = [
  'n',
  'n-pref',
  'n-suf',
  'n-t',
  'pn',
  'num',
  'n-adv',
];

class WordInformation {
  constructor(word, reading, definitions, isNoun) {
    this.word = word;
    this.reading = reading;
    this.definitions = definitions;
    this.isNoun = isNoun;
  }
}

function mkdirIgnoreError(dir) {
  try {
    fs.mkdirSync(dir);
  } catch (err) {
    // NOOP. Ignore error.
  }
}

function getReadings(wordInformations) {
  return wordInformations.map(wordInformation => wordInformation.reading);
}

function getEdictLines() {
  const edictPath = path.resolve(
    __dirname,
    '..',
    'kotoba',
    'resources',
    'dictionaries',
    'edictutf8.txt',
  );

  const edictLines = fs.readFileSync(edictPath, 'utf8').split('\n');
  edictLines.shift(); // First line is a header.
  return edictLines;
}

function buildShiritoriData() {
  const edictLines = getEdictLines();
  const wordInformationIndicesForWordAsHiragana = {};
  const wordInformations = [];

  edictLines.forEach((line) => {
    if (line) {
      const tokens = line.split(' ');
      const word = tokens.shift();
      const wordAsHiragana = convertToHiragana(word);
      const readingPart = tokens[0];
      let reading;
      if (readingPart.startsWith('[')) {
        reading = convertToHiragana(readingPart.replace('[', '').replace(']', ''));
        tokens.shift();
      } else {
        reading = wordAsHiragana;
      }

      const definitionParts = tokens.join(' ').split('/');
      definitionParts.pop(); // The last one is always empty
      definitionParts.shift(); // The first one is always empty
      const definitions = [];
      let isNoun = false;
      definitionParts.forEach((definitionPart) => {
        let definition = definitionPart;
        let partOfSpeechMatch = definition.match(partsOfSpeechPartRegex);
        while (partOfSpeechMatch) {
          definition = definition.replace(partOfSpeechMatch[0], '');
          const partsOfSpeech = partOfSpeechMatch[1].split(',');
          if (!isNoun) {
            isNoun = partsOfSpeech.some(partOfSpeechSymbol =>
              edictNounCodes.indexOf(partOfSpeechSymbol) !== -1);
          }
          partOfSpeechMatch = definition.match(partsOfSpeechPartRegex);
        }

        definition = definition.trim();
        if (definition) {
          definitions.push(definition);
        }
      });

      const wordInformation = new WordInformation(word, reading, definitions, isNoun);
      wordInformations.push(wordInformation);
      const wordIndex = wordInformations.length - 1;

      if (!wordInformationIndicesForWordAsHiragana[wordAsHiragana]) {
        wordInformationIndicesForWordAsHiragana[wordAsHiragana] = [];
      }
      wordInformationIndicesForWordAsHiragana[wordAsHiragana].push(wordIndex);
      if (!wordInformationIndicesForWordAsHiragana[reading]) {
        wordInformationIndicesForWordAsHiragana[reading] = [];
      }
      wordInformationIndicesForWordAsHiragana[reading].push(wordIndex);
    }
  });

  const wordsForStartSequence = {};
  wordsByFrequency.forEach((word) => {
    const wordAsHiragana = convertToHiragana(word);
    if (wordInformationIndicesForWordAsHiragana[wordAsHiragana]) {
      const wordInformationIndices = wordInformationIndicesForWordAsHiragana[wordAsHiragana];
      const wordInformationsForWord = wordInformationIndices.map(index => wordInformations[index]);
      const readings = getReadings(wordInformationsForWord);
      wordStartingSequences.forEach((startSequence) => {
        if (
          wordAsHiragana.startsWith(startSequence)
          || (readings && readings.some(reading => reading.startsWith(startSequence)))
        ) {
          if (!wordsForStartSequence[startSequence]) {
            wordsForStartSequence[startSequence] = [];
          }
          wordsForStartSequence[startSequence].push(word);
        }
      });
    }
  });

  const outputData = {
    wordInformationIndicesForWordAsHiragana,
    wordsForStartSequence,
    wordInformations,
  };

  mkdirIgnoreError(path.resolve(__dirname, '..', 'objects'));
  mkdirIgnoreError(path.resolve(__dirname, '..', 'objects', 'shiritori'));

  const filePath = path.resolve(__dirname, '..', 'objects', 'shiritori', 'word_data.json');
  fs.writeFileSync(filePath, JSON.stringify(outputData));
}

module.exports = buildShiritoriData;
