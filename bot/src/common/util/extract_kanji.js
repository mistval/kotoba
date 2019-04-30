const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/g;

function removeDuplicates(array) {
  if (!array) {
    return [];
  }

  return array.filter((element, i) => array.indexOf(element) === i);
}

function extractKanji(str) {
  return removeDuplicates(str.match(KANJI_REGEX));
}

module.exports = extractKanji;
