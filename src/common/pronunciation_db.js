const mongoConnect = require('./mongo_connect.js');
const mongoose = require('mongoose');

const pronunciationInfoSchema = new mongoose.Schema({
  searchTerm: String,
  words: [{
    katakana: String,
    pitchAccentClass: String,
    pitchAccent: String,
    kanji: [String],
    noPronounceIndices: String,
    nasalPitchIndices: String,
  }],
});

const PronunciationInfo = mongoose.model('PronunciationInfo', pronunciationInfoSchema);

async function addEntry(searchTerm, words) {
  await mongoConnect();
  const entry = new PronunciationInfo({ searchTerm, words });
  return entry.save();
}

async function search(searchTerm) {
  await mongoConnect();
  const searchResult = await PronunciationInfo.findOne({ searchTerm }).lean().exec();

  if (searchResult) {
    return searchResult.words;
  }
}

async function clearPronunciationInfo() {
  await mongoConnect();
  return PronunciationInfo.deleteMany({});
}

module.exports = {
  addEntry,
  search,
  clearPronunciationInfo,
};
