const reload = require('require-reload')(require);
const mongoose = require('mongoose');

const readingsForStartSequence = reload('./../../../generated/shiritori/readings_for_start_sequence.json');

let connectPromise;

const wordSchema = new mongoose.Schema({
  word: String,
  reading: String,
  definitions: [String],
  isNoun: Boolean,
  difficultyScore: Number,
});

const Word = mongoose.model('JapaneseWord', wordSchema);

function connect() {
  if (!connectPromise) {
    connectPromise = new Promise((fulfill, reject) => {
      mongoose.connect('mongodb://localhost/kotoba', { useNewUrlParser: true });
      mongoose.connection.on('error', (err) => {
        reject(err);
      });
      mongoose.connection.once('open', () => {
        fulfill();
      });
    });
  }

  return connectPromise;
}

function addWord(word, reading, definitions, isNoun, difficultyScore) {
  const record = new Word({
    word,
    reading,
    definitions,
    isNoun,
    difficultyScore,
  });

  return record.save();
}

function getMatchingWords(wordAsHiragana) {
  return Word.find({
    $or: [
      { word: wordAsHiragana },
      { reading: wordAsHiragana },
    ],
  }).lean().exec();
}

function clearWords() {
  return Word.deleteMany({});
}

connect();

module.exports = {
  clearWords,
  connect,
  addWord,
  readingsForStartSequence,
  getMatchingWords,
};
