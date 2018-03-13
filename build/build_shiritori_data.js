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
  }
}

function getReadings(wordInformations) {
  return wordInformations.map(wordInformation => wordInformation.reading);
}

function buildShiritoriData() {
  let edictPath = path.resolve(
    __dirname,
    '..',
    'kotoba',
    'resources',
    'dictionaries',
    'edictutf8.txt');

  let edictLines = fs.readFileSync(edictPath, 'utf8').split('\n');
  edictLines.shift(); // First line is a header.

  let wordInformationsForWordAsHiragana = {};

  for (let line of edictLines) {
    if (!line) {
      continue;
    }
    let tokens = line.split(' ');
    let word = tokens.shift();
    let wordAsHiragana = convertToHiragana(word);
    let readingPart = tokens[0];
    let reading;
    if (readingPart.startsWith('[')) {
      reading = convertToHiragana(readingPart.replace('[', '').replace(']', ''));
      tokens.shift();
    } else {
      reading = wordAsHiragana;
    }

    let definitionParts = tokens.join(' ').split('/');
    definitionParts.pop(); // The last one is always empty
    definitionParts.shift(); // The first one is always empty
    let definitions = [];
    let isNoun = false;
    for (let definitionPart of definitionParts) {
      let definition = definitionPart;
      let partsOfSpeech = [];
      let partOfSpeechMatch = definition.match(partsOfSpeechPartRegex);
      while (partOfSpeechMatch) {
        definition = definition.replace(partOfSpeechMatch[0], '');
        partsOfSpeech = partOfSpeechMatch[1].split(',');
        if (!isNoun) {
          isNoun = partsOfSpeech.some(partOfSpeechSymbol => edictNounCodes.indexOf(partOfSpeechSymbol) !== -1);
        }
        partOfSpeechMatch = definition.match(partsOfSpeechPartRegex);
      }

      definition = definition.trim();
      if (definition) {
        definitions.push(definition);
      }
    }

    let wordInformation = new WordInformation(word, reading, definitions, isNoun);
    if (!wordInformationsForWordAsHiragana[wordAsHiragana]) {
      wordInformationsForWordAsHiragana[wordAsHiragana] = [];
    }
    wordInformationsForWordAsHiragana[wordAsHiragana].push(wordInformation);
    if (!wordInformationsForWordAsHiragana[reading]) {
      wordInformationsForWordAsHiragana[reading] = [];
    }
    wordInformationsForWordAsHiragana[reading].push(wordInformation);
  }

  let wordsForStartSequence = {};
  for (let word of wordsByFrequency) {
    let wordAsHiragana = convertToHiragana(word);
    if (!wordInformationsForWordAsHiragana[wordAsHiragana]) {
      continue;
    }
    let readings = getReadings(wordInformationsForWordAsHiragana[wordAsHiragana]);
    for (let startSequence of wordStartingSequences) {
      if (wordAsHiragana.startsWith(startSequence) || (readings && readings.some(reading => reading.startsWith(startSequence)))) {
        if (!wordsForStartSequence[startSequence]) {
          wordsForStartSequence[startSequence] = [];
        }
        wordsForStartSequence[startSequence].push(word);
      }
    }
  }

  let outputData = {
    wordInformationsForWordAsHiragana,
    wordsForStartSequence,
  };

  mkdirIgnoreError(path.resolve(__dirname, '..', 'objects'));
  mkdirIgnoreError(path.resolve(__dirname, '..', 'objects', 'shiritori'));

  let filePath = path.resolve(__dirname, '..', 'objects', 'shiritori', 'word_data.json');
  fs.writeFileSync(filePath, JSON.stringify(outputData));
}

module.exports = buildShiritoriData;
