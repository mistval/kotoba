const reload = require('require-reload')(require);
const mongoose = require('mongoose');
const mongoConnect = require('./../mongo_connect.js');

const wordSchema = new mongoose.Schema({
  word: { type: String, index: true },
  reading: { type: String, index: true },
  definitions: [String],
  isNoun: Boolean,
  difficultyScore: Number,
});

const Word = mongoose.model('JapaneseWord', wordSchema);

async function addWord(word, reading, definitions, isNoun, difficultyScore) {
  await mongoConnect();
  const record = new Word({
    word,
    reading,
    definitions,
    isNoun,
    difficultyScore,
  });

  return record.save();
}

async function getMatchingWords(wordAsHiragana) {
  await mongoConnect();
  const results = await Word.find({
    $or: [
      { word: wordAsHiragana },
      { reading: wordAsHiragana },
    ],
  return results;
}

async function clearWords() {
  await mongoConnect();
  return Word.deleteMany({});
}

module.exports = {
  clearWords,
  addWord,
  getMatchingWords,
};
