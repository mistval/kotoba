const wordData = require('./../../../generated/shiritori/word_data.json');

function getWordInformationsForWordAsHirgana(wordAsHiragana) {
  const indices = wordData.wordInformationIndicesForWordAsHiragana[wordAsHiragana];
  if (!indices) {
    return [];
  }
  return indices.map(index => wordData.wordInformations[index]);
}

module.exports = {
  getWordInformationsForWordAsHirgana,
  wordsForStartSequence: wordData.wordsForStartSequence,
};
