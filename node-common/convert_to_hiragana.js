const lengthenerForChar = require("./hiragana_lengtheners.js");

function convertCharToHiragana(previousChar, char) {
  if (char === 'ー') {
    if (!lengthenerForChar[previousChar]) {
      return char;
    }
    return lengthenerForChar[previousChar];
  }
  if (char >= '\u30A0' && char <= '\u30FF') {
    return String.fromCharCode(char.charCodeAt(0) - 0x60);
  }
  return char;
}

function convertStringToHirgana(str) {
  let previousChar;
  let result = '';
  str.split('').forEach((char) => {
    const newChar = convertCharToHiragana(previousChar, char);
    result += newChar;
    previousChar = newChar;
  });

  return result;
}

module.exports = convertStringToHirgana;
