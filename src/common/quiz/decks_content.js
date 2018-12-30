'use strict'
const reload = require('require-reload')(require);
const constants = reload('./../constants.js');

const stationsList = ["stations_full","stations_tokyo","stations_osaka","stations_hokaido","stations_fukuoka","stations_kyoto","stations_yamanashi","stations_nagano","stations_nigata","stations_aomori","stations_iwate","stations_miyagi","stations_akita","stations_fukushima","stations_yamagata","stations_toyama","stations_ishikawa","stations_fukui","stations_kanagawa","stations_chiba","stations_saitama","stations_ibaraki","stations_gunma","stations_okayama","stations_hiroshima","stations_tottori","stations_shimane","stations_yamaguchi","stations_hyougo","stations_shiga","stations_nara","stations_wakayama","stations_shizuoka","stations_gifu","stations_mie","stations_saga","stations_nagasaki","stations_kumamoto","stations_oita","stations_miyazaki","stations_kagoshima","stations_tokushima","stations_kagawa","stations_ehime","stations_kochi","stations_okinawa"];
const placesList = ["places_full","tokyo","kanagawa","saitama","chiba","ibaragi","tochigi","gunma","osaka","hyogo","kyoto","shiga","nara","wakayama","hokkaido","aomori","iwate","miyagi","akita","yamagata","fukushima","toyama","ishikawa","fukui","niigata","nagano","yamanashi","aichi","gifu","shizuoka","mie","tottori","shimane","okayama","hiroshima","yamaguchi","tokushima","kagawa","ehime","kouchi","fukuoka","saga","nagasaki","kumamoto","ooita","miyazaki","kagoshima","okinawa"];

const categoryFields = [
  {name: 'JLPT Kanji Reading Decks', value: 'N5 N4 N3 N2 N1'},
  {name: 'JLPT Grammar Decks', value: 'gN5 gN4 gN3 gN2 gN1 vuN3 vuN2 vuN1'},
  {name: 'JLPT Kanji Usage Decks', value: 'k_N5 k_N4 k_N3 k_N2 k_N1'},
  {name: 'JLPT Listening Decks (audio) (under construction)', value: 'LN3 LN2 LN1'},
  {name: 'Kanken Kanji Reading Decks', value: '10k 9k 8k 7k 6k 5k 4k 3k j2k 2k j1k 1k'},
  {name: 'Listening Vocabulary Decks (audio)', value: 'lvN5 lvN4 lvN3 lvN2 lvN1 lv10k lv9k lv8k lv7k lv6k lv5k lv4k lv3k lvj2k lv2k lvj1k lv1k'},
  {name: '用語 Decks', value: 'pasokon rikagaku igaku shinrigaku keizai houritsu kenchiku animals birds bugs fish plants vegetables'},
  {name: 'Japanese Proper Noun Decks', value: 'myouji namae onago seiyuu cities prefectures countries'},
  {name: 'Japanese Place Name Decks', value: 'places_full tokyo osaka hokaido aichi kanagawa (say **<prefix>quiz places** to see the full list)'},
  {name: 'Japanese Station Name Decks', value: 'stations_full stations_tokyo stations_osaka (say **<prefix>quiz stations** to see the full list)'},
  {name: 'Japanese Misc. Decks', value: 'hiragana katakana kirakira sao jptrivia common numbers k33 hard haard insane yojijukugo kokuji onomato 擬音語 ranobe radicals kklc jouyou images jpdefs'},
  {name: 'Japanese Word Meaning Decks', value: 'N5m N4m N3m N2m N1m 10km 9km 8km 7km 6km 5km 4km 3km j2km 2km j1km 1km animalsm birdsm bugsm fishm plantsm vegetablesm hardm haardm commonm kokujim kklcm'},
  {name: 'English Decks', value: 'defs1 defs2 defs3 (up to defs17)\nanagrams3 anagrams4 anagrams5 (up to anagrams10)\nejtrans'},
  {name: 'Mixed Decks. The Grand Tour!', value: 'easymix medmix hardmix hardermix insanemix'},
];

module.exports.createContent = function(prefix) {
  return {
    embed: {
      title: 'Quiz',
      description: `Say **${prefix}quiz deckname** to start a quiz (Example: **${prefix}quiz N5**). Say **${prefix}quiz stop** to stop a quiz. Say **nodelay** after the deck name for a lightning fast quiz, for example: **k!quiz N1 nodelay**. [Visit me on the web](http://kotobaweb.com/bot/quiz) to see advanced options and settings that you can use.`,
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: categoryFields.map(field => ({ name: field.name, value: field.value.replace(/<prefix>/g, prefix) })),
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `You can mix any decks by using the + symbol. For example: ${prefix}quiz N5+N4+N3`,
      },
    },
  };
};

module.exports.getAdvancedHelp = function(keyword) {
  if (keyword === 'stations') {
    return `Stations reading quizzes \`\`\`${stationsList.join(', ')}\`\`\``;
  } else if (keyword === 'places') {
    return `Places reading quizzes \`\`\`${placesList.join(', ')}\`\`\``;
  }
};
