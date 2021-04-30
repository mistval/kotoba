'use strict'

const constants = require('./../constants.js');

const stationsList = ["stations_full","stations_tokyo","stations_osaka","stations_hokkaido","stations_fukuoka","stations_kyoto","stations_yamanashi","stations_nagano","stations_niigata","stations_aomori","stations_iwate","stations_miyagi","stations_akita","stations_fukushima","stations_yamagata","stations_toyama","stations_ishikawa","stations_fukui","stations_kanagawa","stations_chiba","stations_saitama","stations_ibaraki","stations_gunma","stations_okayama","stations_hiroshima","stations_tottori","stations_shimane","stations_yamaguchi","stations_hyougo","stations_shiga","stations_nara","stations_wakayama","stations_shizuoka","stations_gifu","stations_mie","stations_saga","stations_nagasaki","stations_kumamoto","stations_oita","stations_miyazaki","stations_kagoshima","stations_tokushima","stations_kagawa","stations_ehime","stations_kochi","stations_okinawa"];
const placesList = ["places_full","tokyo","kanagawa","saitama","chiba","ibaraki","tochigi","gunma","osaka","hyogo","kyoto","shiga","nara","wakayama","hokkaido","aomori","iwate","miyagi","akita","yamagata","fukushima","toyama","ishikawa","fukui","niigata","nagano","yamanashi","aichi","gifu","shizuoka","mie","tottori","shimane","okayama","hiroshima","yamaguchi","tokushima","kagawa","ehime","kochi","fukuoka","saga","nagasaki","kumamoto","oita","miyazaki","kagoshima","okinawa"];

const categoryFields = [
  {name: 'JLPT Decks', value: 'N5 N4 N3 N2 N1 gN5 gN4 gN3 gN2 gN1 vuN3 vuN2 vuN1 k_N5 k_N4 k_N3 k_N2 k_N1 N5m N4m N3m N2m N1m'},
  {name: 'Kanken Decks', value: '10k 9k 8k 7k 6k 5k 4k 3k j2k 2k j1k 1k 10km 9km 8km 7km 6km 5km 4km 3km j2km 2km j1km 1km'},
  {name: 'Listening Decks (must be in voice channel)', value: 'LN3 LN2 LN1 lvN5 lvN4 lvN3 lvN2 lvN1 lv10k lv9k lv8k lv7k lv6k lv5k lv4k lv3k lvj2k lv2k lvj1k lv1k'},
  {name: '用語 Decks', value: 'suugaku pasokon rikagaku igaku shinrigaku keizai houritsu kenchiku buddha nature animals birds bugs fish plants vegetables'},
  {name: 'Japanese Place Name Decks', value: 'places_full tokyo osaka hokkaido aichi kanagawa (say **<prefix>quiz places** to see the rest)'},
  {name: 'Japanese Station Name Decks', value: 'stations_full stations_tokyo stations_osaka (say **<prefix>quiz stations** to see the rest)'},
  {name: 'Japanese Misc. Decks', value: 'hiragana katakana kanawords rtk_vocab rtk_all kotowaza common common_nojlpt k33 hard haard insane hentaigana kklc ranobe numbers yojijukugo kirakira dqn sao jsyn jsyn_full jptrivia kokuji onomato 擬音語 radicals jouyou images jpdefs myouji namae onago seiyuu cities prefectures countries emperors kunyomi pokemon jmdict jmndict vnfreq'},
  {name: 'English Decks', value: 'anagrams4 anagrams5 anagrams6 (up to anagrams10)\nejtrans trivia esyn_easy esyn_med esyn_hard'},
  {name: 'Mixed Decks', value: 'easymix medmix hardmix hardermix insanemix easymixjp medmixjp hardmixjp hardermixjp insanemixjp'},
];

module.exports.createContent = function(prefix) {
  return {
    embed: {
      title: 'Quiz',
      description: `Say **${prefix}quiz deckname** to start a quiz (Example: **${prefix}quiz N5**). Say **${prefix}quiz stop** to stop a quiz. Say **nodelay** after the deck name for a lightning fast quiz, for example: **k!quiz N1 nodelay**. For advanced help, say **${prefix}quiz help** or [visit me on the web](https://kotobaweb.com/bot/quiz).`,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: categoryFields.map(field => ({ name: field.name, value: field.value.replace(/<prefix>/g, prefix) })),
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `You can mix any decks by using the + symbol. For example: ${prefix}quiz N5+N4+N3`,
      },
    },
  };
};

module.exports.getCategoryHelp = function(keyword) {
  if (keyword === 'stations') {
    return `Stations reading quizzes \`\`\`${stationsList.join(', ')}\`\`\``;
  } else if (keyword === 'places') {
    return `Places reading quizzes \`\`\`${placesList.join(', ')}\`\`\``;
  }
};
