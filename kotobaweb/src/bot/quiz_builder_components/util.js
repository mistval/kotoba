function convertRangeNumberToString(number) {
  if (number === Number.POSITIVE_INFINITY) {
    return 'end';
  }

  return number.toString();
}

function convertRangeStringToNumber(string) {
  if (string === 'end') {
    return Number.POSITIVE_INFINITY;
  }

  return parseInt(string);
}

function createDeck(name, startIndex = 1, endIndex = Number.POSITIVE_INFINITY) {
  return { name, startIndex, endIndex };
}

module.exports = {
  convertRangeNumberToString,
  convertRangeStringToNumber,
  createDeck,
};