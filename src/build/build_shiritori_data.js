const wordStartingSequences = require('./shiritori_word_starting_sequences.js');
const convertToHiragana = require('./../common/util/convert_to_hiragana.js');
const fs = require('fs');
const wordsByFrequency = require('./../../resources/dictionaries/frequency.json');
const path = require('path');
const wordDb = require('./../common/shiritori/jp_word_db.js');
const mkdirp = require('mkdirp').sync;

const VERBOSE = true;

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'generated', 'shiritori');

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

const edictPath = path.resolve(
  __dirname,
  '..',
  '..',
  'resources',
  'dictionaries',
  'edictutf8.txt',
);

class WordInformation {
  constructor(word, reading, definitions, isNoun, difficultyScore) {
    this.word = word;
    this.reading = reading;
    this.definitions = definitions;
    this.isNoun = isNoun;
    this.difficultyScore = difficultyScore;
  }
}

function getEdictLines() {
  const edictLines = fs.readFileSync(edictPath, 'utf8').split('\n');
  edictLines.shift(); // First line is a header.
  return edictLines;
}

function calculateDifficultyScore(word) {
  return wordsByFrequency.indexOf(word);
}

function log(str) {
  if (VERBOSE) {
    console.log(str);
  }
}

function buildReadingsForStartSequence(highestDifficultyForReading) {
  const readingsForStartSequence = {};
  const readings = Object.keys(highestDifficultyForReading);

  log('Building readings for start sequence index');

  readings.forEach((reading) => {
    // Skip any readings with only words of unknown difficulty
    const highestDifficulty = highestDifficultyForReading[reading];
    if (highestDifficulty === -1) {
      return;
    }

    const startSequences = wordStartingSequences.filter(
      startSequence => reading.startsWith(startSequence));

    startSequences.forEach((startSequence) => {
      if (!readingsForStartSequence[startSequence]) {
        readingsForStartSequence[startSequence] = [];
      }

      readingsForStartSequence[startSequence].push({ reading, highestDifficulty });
    });
  });

  // Sort the readings for each start sequence in ascending order based on
  // the highest difficulty word known for that reading.
  wordStartingSequences.forEach((startSequence) => {
    readingInfos = readingsForStartSequence[startSequence] || [];
    readingInfos.sort((a, b) => a.highestDifficulty - b.highestDifficulty);
    readingsForStartSequence[startSequence] = readingInfos.map(info => info.reading);
  });

  fs.writeFileSync(
    path.resolve(OUTPUT_DIR, 'readings_for_start_sequence.json'),
    JSON.stringify(readingsForStartSequence));
}

async function build() {
  mkdirp(OUTPUT_DIR);

  log('-- Connecting to mongo DB');
  await wordDb.connect();
  log('-- Clearing word DB');
  await wordDb.clearWords();
  log('-- Entering words into DB');

  const highestDifficultyForReading = {};

  const edictLines = getEdictLines();
  let promises = [];
  for (let i = 0; i < edictLines.length; ++i) {
    const line = edictLines[i];

    if (!line) {
      continue;
    }

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

    const difficulty = calculateDifficultyScore(word);
    highestDifficultyForReading[reading] = highestDifficultyForReading[reading] ?
      Math.max(highestDifficultyForReading[reading], difficulty) :
      difficulty;

    const wordInformation = new WordInformation(
      word,
      reading,
      definitions,
      isNoun,
      difficulty,
    );

    promises.push(wordDb.addWord(word, reading, definitions, isNoun, difficulty));

    // To keep down memory usage
    if (promises.length >= 1000) {
      await Promise.all(promises);
      promises = [];
    }

    if (i % 10000 === 0) {
      log(`-- Words entered into DB: ${i}`);
    }
  }

  buildReadingsForStartSequence(highestDifficultyForReading);

  return Promise.all(promises);
}

module.exports = build;
