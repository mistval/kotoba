const mongoose = require('mongoose');

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

function clearWords() {
  return Word.deleteMany({});
}

function getRandomForReading(reading) {
  return Word.find({ reading }).sort({ difficultyScore: -1 }).limit(1);
}

module.exports = {
  clearWords,
  connect,
  addWord,
};
