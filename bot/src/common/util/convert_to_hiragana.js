const lengthenerForChar = {
  あ: 'あ',
  い: 'い',
  う: 'う',
  え: 'い',
  お: 'う',

  か: 'あ',
  き: 'い',
  く: 'う',
  け: 'い',
  こ: 'う',

  さ: 'あ',
  し: 'い',
  す: 'う',
  せ: 'い',
  そ: 'う',

  た: 'あ',
  ち: 'い',
  つ: 'う',
  て: 'い',
  と: 'う',

  な: 'あ',
  に: 'い',
  ぬ: 'う',
  ね: 'い',
  の: 'う',

  は: 'あ',
  ひ: 'い',
  ふ: 'う',
  へ: 'い',
  ほ: 'う',

  ま: 'あ',
  み: 'い',
  む: 'う',
  め: 'い',
  も: 'う',

  や: 'あ',
  ゆ: 'う',
  よ: 'う',

  ら: 'あ',
  り: 'い',
  る: 'う',
  れ: 'い',
  ろ: 'う',

  ゃ: 'あ',
  ゅ: 'う',
  ょ: 'う',
  ぉ: 'お',
  ぃ: 'い',
  わ: 'あ',
  ぁ: 'あ',
  ぇ: 'い',
  ぅ: 'う',

  が: 'あ',
  ぎ: 'い',
  ぐ: 'う',
  げ: 'い',
  ご: 'う',

  ざ: 'あ',
  じ: 'い',
  ず: 'う',
  ぜ: 'い',
  ぞ: 'う',

  だ: 'あ',
  ぢ: 'い',
  づ: 'う',
  で: 'い',
  ど: 'う',

  ば: 'あ',
  び: 'い',
  ぶ: 'う',
  べ: 'い',
  ぼ: 'う',

  ぱ: 'あ',
  ぴ: 'い',
  ぷ: 'う',
  ぺ: 'い',
  ぽ: 'う',
};

function convertCharToHiragana(previousChar, char) {
  if (char >= '0' && char <= '9') {
    return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
  }
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
