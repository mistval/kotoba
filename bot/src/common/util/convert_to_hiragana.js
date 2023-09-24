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

const hiraganaForRomaji = {
  a: 'あ',
  i: 'い',
  u: 'う',
  e: 'え',
  o: 'お',

  ka: 'か',
  ki: 'き',
  ku: 'く',
  ke: 'け',
  ko: 'こ',

  kka: 'っか',
  kki: 'っき',
  kku: 'っく',
  kke: 'っけ',
  kko: 'っこ',

  sa: 'さ',
  shi: 'し',
  si: 'し',
  su: 'す',
  se: 'せ',
  so: 'そ',

  ssa: 'っさ',
  sshi: 'っし',
  ssi: 'っし',
  ssu: 'っす',
  sse: 'っせ',
  sso: 'っそ',

  ta: 'た',
  chi: 'ち',
  ti: 'ち',
  tsu: 'つ',
  tu: 'つ',
  te: 'て',
  to: 'と',

  tta: 'った',
  cchi: 'っち',
  tti: 'っち',
  ttsu: 'っつ',
  ttu: 'っつ',
  tte: 'って',
  tto: 'っと',

  na: 'な',
  ni: 'に',
  nu: 'ぬ',
  ne: 'ね',
  no: 'の',

  ha: 'は',
  hi: 'ひ',
  hu: 'ふ',
  fu: 'ふ',
  he: 'へ',
  ho: 'ほ',

  ma: 'ま',
  mi: 'み',
  mu: 'む',
  me: 'め',
  mo: 'も',

  ya: 'や',
  yu: 'ゆ',
  yo: 'よ',

  ra: 'ら',
  ri: 'り',
  ru: 'る',
  re: 'れ',
  ro: 'ろ',

  wa: 'わ',
  wo: 'を',
  nn: 'ん',
  n: 'ん',
  'n\'': 'ん',

  kya: 'きゃ',
  kyu: 'きゅ',
  kyo: 'きょ',

  kkya: 'っきゃ',
  kkyu: 'っきゅ',
  kkyo: 'っきょ',

  sha: 'しゃ',
  sya: 'しゃ',
  shu: 'しゅ',
  syu: 'しゅ',
  sho: 'しょ',
  syo: 'しょ',

  ssha: 'っしゃ',
  ssya: 'っしゃ',
  sshu: 'っしゅ',
  ssyu: 'っしゅ',
  ssho: 'っしょ',
  ssyo: 'っしょ',

  cha: 'ちゃ',
  tya: 'ちゃ',
  chu: 'ちゅ',
  tyu: 'ちゅ',
  cho: 'ちょ',
  tyo: 'ちょ',

  ccha: 'っちゃ',
  ttya: 'っちゃ',
  cchu: 'っちゅ',
  ttyu: 'っちゅ',
  ccho: 'っちょ',
  ttyo: 'っちょ',

  nya: 'にゃ',
  nyu: 'にゅ',
  nyo: 'にょ',

  hya: 'ひゃ',
  hyu: 'ひゅ',
  hyo: 'ひょ',

  mya: 'みゃ',
  myu: 'みゅ',
  myo: 'みょ',

  rya: 'りゃ',
  ryu: 'りゅ',
  ryo: 'りょ',

  gya: 'ぎゃ',
  gyu: 'ぎゅ',
  gyo: 'ぎょ',

  ja: 'じゃ',
  jya: 'じゃ',
  zya: 'じゃ',
  ju: 'じゅ',
  jyu: 'じゅ',
  zyu: 'じゅ',
  jo: 'じょ',
  jyo: 'じょ',
  zyo: 'じょ',

  dya: 'ぢゃ',
  dyu: 'ぢゅ',
  dyo: 'ぢょ',

  bya: 'びゃ',
  byu: 'びゅ',
  byo: 'びょ',

  pya: 'ぴゃ',
  pyu: 'ぴゅ',
  pyo: 'ぴょ',

  ppya: 'っぴゃ',
  ppyu: 'っぴゅ',
  ppyo: 'っぴょ',

  ga: 'が',
  gi: 'ぎ',
  gu: 'ぐ',
  ge: 'げ',
  go: 'ご',

  za: 'ざ',
  ji: 'じ',
  zi: 'じ',
  zu: 'ず',
  ze: 'ぜ',
  zo: 'ぞ',

  da: 'だ',
  di: 'ぢ',
  du: 'づ',
  dzu: 'づ',
  de: 'で',
  do: 'ど',

  ba: 'ば',
  bi: 'び',
  bu: 'ぶ',
  be: 'べ',
  bo: 'ぼ',

  pa: 'ぱ',
  pi: 'ぴ',
  pu: 'ぷ',
  pe: 'ぺ',
  po: 'ぽ',

  ppa: 'っぱ',
  ppi: 'っぴ',
  ppu: 'っぷ',
  ppe: 'っぺ',
  ppo: 'っぽ',

  ca: 'か',
  ci: 'し',
  cu: 'く',
  ce: 'せ',
  co: 'こ',

  cya: 'ちゃ',
  cyi: 'ちぃ',
  cyu: 'ちゅ',
  cye: 'ちぇ',
  cyo: 'ちょ',

  cca: 'っか',
  cci: 'っし',
  ccu: 'っく',
  cce: 'っせ',
  cco: 'っこ',

  ccya: 'っちゃ',
  ccyi: 'っちぃ',
  ccyu: 'っちゅ',
  ccye: 'っちぇ',
  ccyo: 'っちょ',

  // Katakana only

  gga: 'っが',
  ggi: 'っぎ',
  ggu: 'っぐ',
  gge: 'っげ',
  ggo: 'っご',

  zza: 'っざ',
  zzi: 'っじ',
  jji: 'っじ',
  zzu: 'っず',
  zze: 'っぜ',
  zzo: 'っぞ',

  dda: 'っだ',
  ddi: 'っぢ',
  ddu: 'っづ',
  ddzu: 'っづ',
  dde: 'っで',
  ddo: 'っど',

  bba: 'っば',
  bbi: 'っび',
  bbu: 'っぶ',
  bbe: 'っべ',
  bbo: 'っぼ',

  fa: 'ふぁ',
  fi: 'ふぃ',
  fyu: 'ふゅ',
  fe: 'ふぇ',
  fo: 'ふぉ',

  wi: 'うぃ',
  wyi: 'ゐ',
  we: 'うぇ',
  wye: 'ゑ',
  who: 'うぉ',

  va: 'ゔぁ',
  vi: 'ゔぃ',
  vu: 'ゔ',
  ve: 'ゔぇ',
  vo: 'ゔぉ',

  tsa: 'つぁ',
  tsi: 'つぃ',
  tse: 'つぇ',
  tso: 'つぉ',

  che: 'ちぇ',
  she: 'しぇ',
  je: 'じぇ',
  ye: 'いぇ',

  kwa: 'くぁ',
  kwi: 'くぃ',
  kwe: 'くぇ',
  kwo: 'くぉ',

  gwa: 'ぐぁ',
  gwi: 'ぐぃ',
  gwe: 'ぐぇ',
  gwo: 'ぐぉ',

  thi: 'てぃ',
  dhi: 'でぃ',
  twu: 'とぅ',
  dwu: 'どぅ',

  la: 'ぁ',
  xa: 'ぁ',
  li: 'ぃ',
  xi: 'ぃ',
  lu: 'ぅ',
  xu: 'ぅ',
  le: 'ぇ',
  xe: 'ぇ',
  lo: 'ぉ',
  xo: 'ぉ',
  lya: 'ゃ',
  xya: 'ゃ',
  lyu: 'ゅ',
  xyu: 'ゅ',
  lyo: 'ょ',
  xyo: 'ょ',
  ltsu: 'っ',
  xtsu: 'っ',
  ltu: 'っ',
  xtu: 'っ',
  lwa: 'ゎ',
  xwa: 'ゎ',
};

function convertStringToHiragana(str) {
  const converted = [];

  let nextIndex = 0;
  while (nextIndex < str.length) {
    const currentIndex = nextIndex;
    const char = str[nextIndex];
    const previousChar = converted[converted.length - 1];

    if (char >= '\u3040' && char <= '\u309F') {
      // Already hiragana
      converted.push(char);
      nextIndex += 1;
    } else if (char >= '0' && char <= '9') {
      // Convert half-width numerals into full-width
      converted.push(String.fromCharCode(char.charCodeAt(0) + 0xFEE0));
      nextIndex += 1;
    } else if (char === 'ー' || char === '-') {
      // Convert ー to a hiragana representation based on the previous character
      if (lengthenerForChar[previousChar]) {
        converted.push(lengthenerForChar[previousChar]);
      } else {
        converted.push(char);
      }

      nextIndex += 1;
    } else if (char >= '\u30A0' && char <= '\u30FF') {
      // Convert katakana to hiragana
      converted.push(String.fromCharCode(char.charCodeAt(0) - 0x60));
      nextIndex += 1;
    } else if (char >= 'a' && char <= 'z') {
      // Convert romaji to hiragana
      let didConvert = false;
      for (let length = 4; length >= 1; length -= 1) {
        const chars = str.slice(nextIndex, nextIndex + length);
        const hiragana = hiraganaForRomaji[chars];

        if (hiragana) {
          converted.push(...hiragana);
          nextIndex += length;
          didConvert = true;
          break;
        }
      }

      if (!didConvert) {
        // Could not find a conversion for that romaji
        converted.push(char);
        nextIndex += 1;
      }
    } else if (char === 'ｎ') {
      converted.push('ん');
      nextIndex += 1;
    } else {
      // Could not convert
      converted.push(char);
      nextIndex += 1;
    }

    if (currentIndex === nextIndex) {
      throw new Error('I\'m dumb and managed to write an infinite loop');
    }
  }

  return converted.join('');
}

module.exports = convertStringToHiragana;
