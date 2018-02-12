const state = require('./../static_state.js');

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
    const logger = reload('monochrome-bot').logger;
    const wordStartingSequences = reload('./word_starting_sequences.js');
    const wordsByFrequency = reload('./../resources/dictionaries/frequency.json');

    const edictLines = fs.readFileSync(__dirname + '/../resources/dictionaries/edictutf8.txt', 'utf8').split('\n');
    edictLines.shift(); // First line is a header.

    const wordInformationsForReading = {};
    const readingsForWord = {};

    const partsOfSpeechPartRegex = /(?:\(.*?\) ){1,10}/;

    const partOfSpeechStringForId = {
      n: 'noun',
      'adj-i': 'い adj',
      'adj-na': 'な adj',
      'adj-no': 'の adj',
    };

    class Definition {
      constructor(meaning, partsOfSpeechIds) {
        this.meaning = meaning;
        this.partsOfSpeech = partsOfSpeechIds.map(id => partOfSpeechStringForId[id]).filter(str => !!str);
      }
    }

    for (let line of edictLines) {
      if (!line) {
        continue;
      }
      let tokens = line.split(' ');
      let word = tokens.shift();
      let readingPart = tokens[0];
      let reading;
      if (readingPart.startsWith('[')) {
        reading = readingPart.replace('[', '').replace(']', '');
        tokens.shift();
      } else {
        reading = word;
      }

      let definitionParts = tokens.join(' ').split('/');
      definitionParts.pop(); // The last one is always empty
      definitionParts.shift(); // The first one is always empty
      let definitions = [];
      for (let definitionPart of definitionParts) {
        let partsOfSpeech = [];
        let partOfSpeechMatch = definitionPart.match(partsOfSpeechPartRegex);

        let definition;
        if (partOfSpeechMatch) {
          definition = definitionPart.replace(partOfSpeechMatch[0], '');
          partsOfSpeech = partOfSpeechMatch[0].replace(/\(/g, '').replace(/\)/g, '').trim().split(' ').map(partOfSpeech => partOfSpeech.trim());
        } else {
          definition = definitionPart;
        }

        definitions.push(new Definition(definition, partsOfSpeech));
      }

      if (!wordInformationsForReading[reading]) {
        wordInformationsForReading[reading] = [];
      }

      wordInformationsForReading[reading].push({ word, definitions });

      if (!readingsForWord[word]) {
        readingsForWord[word] = [];
      }

      readingsForWord[word].push(reading);
    }

    let wordsForStartSequence = {};
    for (let startSequence of wordStartingSequences) {
      wordsForStartSequence[startSequence] = [];
    }

    for (let word of wordsByFrequency) {
      for (let startSequence of wordStartingSequences) {
        if (word.startsWith(startSequence)) {
          wordsForStartSequence[startSequence].push(word);
        }
      }
    }

    state.shiritori.wordData = {
      readingsForWord,
      wordInformationsForReading,
      wordsForStartSequence,
    };

    fs.writeFileSync(__dirname + '/shiritori_word_data.json', JSON.stringify(state.shiritori.wordData));
    logger.logSuccess('SHIRITORI', 'Generated shiritori data and saved to disk');
  }
}

function getRandomArrayElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomWord() {
  let startSequences = Object.keys(state.shiritori.wordData.wordsForStartSequence);
  let startSequence = getRandomArrayElement(startSequences);
  let words = state.shiritori.wordData.wordsForStartSequence[startSequence];
  let word = getRandomArrayElement(words);
  return word;
}

module.exports = state.shiritori.wordData;
module.exports.getRandomWord = getRandomWord;
