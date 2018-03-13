const wordData = require('./../../objects/shiritori/word_data.json');

function getWordInformationsForWordAsHirgana(wordAsHiragana) {
  let indices = wordData.wordInformationIndicesForWordAsHiragana[wordAsHiragana];
  return indices.map(index => wordData.wordInformations[index]);
}

module.exports = {
  getWordInformationsForWordAsHirgana,
  wordsForStartSequence: wordData.wordsForStartSequence,
};
