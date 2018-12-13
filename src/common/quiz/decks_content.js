'use strict'
const reload = require('require-reload')(require);
const constants = reload('./../constants.js');

const categoryFields = [
  {name: 'JLPT Kanji Reading Decks', value: 'N5 N4 N3 N2 N1'},
  {name: 'JLPT Listening Decks (audio) (under construction)', value: 'LN3 LN2 LN1'},
  {name: 'JLPT Grammar Decks', value: 'gN5 gN4 gN3 gN2 gN1'},
  {name: 'JLPT Vocabulary Usage Decks', value: 'vuN3 vuN2 vuN1'},
  {name: 'JLPT Kanji Usage Decks', value: 'k_N5 k_N4 k_N3 k_N2 k_N1'},
  {name: 'Kanken Kanji Reading Decks', value: '10k 9k 8k 7k 6k 5k 4k 3k j2k 2k j1k 1k'},
  {name: 'Listening Vocabulary Decks (audio)', value: 'lvN5 lvN4 lvN3 lvN2 lvN1 lv10k lv9k lv8k lv7k lv6k lv5k lv4k lv3k lvj2k lv2k lvj1k lv1k'},
  {name: 'Japanese Proper Noun Decks', value: 'myouji namae seiyuu cities prefectures countries'},
  {name: 'Mother Nature Decks (not for the faint of heart)', value: 'animals birds bugs fish plants vegetables'},
  {name: 'Kana Decks', value: 'hiragana katakana'},
  {name: 'Japanese Misc. Decks', value: 'sao jptrivia common numbers hard haard insane yojijukugo kokuji onomato 擬音語 ranobe radicals kklc jouyou images'},
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
      fields: categoryFields,
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `You can mix any decks by using the + symbol. For example: ${prefix}quiz N5+N4+N3`,
      },
    },
  };
};

module.exports.getHelpForCategory = function(userInput) {
  userInput = userInput.toLowerCase();
  for (let categoryField of categoryFields) {
    let categoryName = categoryField.name.toLowerCase();
    if (categoryName.startsWith(userInput)) {
      let examples = 'You can start a quiz with the following commands:\n';
      for (let deckName of categoryField.value.split(' ')) {
        examples += '\nk!quiz ' + deckName;
      }
      let content = {
        embed: {
          title: categoryField.name,
          description: examples,
          color: constants.EMBED_NEUTRAL_COLOR,
        },
      };

      return content;
    }
  }
}
