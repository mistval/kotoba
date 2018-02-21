const reload = require('require-reload')(require);
const state = require('./../static_state.js');
const wordStartingSequences = reload('./word_starting_sequences.js');
const logger = reload('monochrome-bot').logger;
const convertToHiragana = reload('./../util/convert_to_hiragana.js');

class Definition {
  constructor(meaning, isNoun) {
    this.meaning = meaning;
    this.isNoun = isNoun;
  }
}

class WordInformation {
  constructor(word, reading, definitions) {
    this.word = word;
    this.reading = reading;
    this.definitions = definitions;
  }
}

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

function getReadings(wordInformations) {
  return wordInformations.map(wordInformation => wordInformation.reading);
}

if (!state.shiritori) {
  state.shiritori = {};
}

if (!state.shiritori.wordData) {
  try {
    state.shiritori.wordData = require('./shiritori_word_data.json');
    logger.logSuccess('SHIRITORI', 'Loaded shiritori word data from disk');
  } catch (err) {
    const reload = require('require-reload')(require);
    const fs = require('fs');
    const wordStartingSequences = reload('./word_starting_sequences.js');
    const wordsByFrequency = reload('./../resources/dictionaries/frequency.json');

    const edictLines = fs.readFileSync(__dirname + '/../resources/dictionaries/edictutf8.txt', 'utf8').split('\n');
    edictLines.shift(); // First line is a header.

    const wordInformationsForWordAsHiragana ={};

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
          definitions.push(new Definition(definition, isNoun));
        }
      }

      let wordInformation = new WordInformation(word, reading, definitions);
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

    state.shiritori.wordData = {
      wordInformationsForWordAsHiragana,
      wordsForStartSequence,
    };

    fs.writeFileSync(__dirname + '/shiritori_word_data.json', JSON.stringify(state.shiritori.wordData));
    logger.logSuccess('SHIRITORI', 'Generated shiritori data and saved to disk');
  }
}

module.exports = state.shiritori.wordData;
