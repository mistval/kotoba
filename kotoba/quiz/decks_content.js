'use strict'
const reload = require('require-reload')(require)
const constants = reload('./../constants.js');

const categoryFields = [
  {'name': 'JLPT Reading Decks', value: 'N5 N4 N3 N2 N1'},
  {'name': 'JLPT Kanji Usage Decks', value: 'k_N5 k_N4 k_N3 k_N2 k_N1'},
  {'name': 'Kanken Reading Decks', value: '10k 9k 8k 7k 6k 5k 4k 3k j2k 2k j1k 1k'},
  {'name': 'Japanese Proper Noun Decks', value: 'myouji namae onago seiyuu cities prefectures stations tokyo countries places kirakira'},
  {'name': 'Mother Nature Decks (not for the faint of heart)', value: 'animals birds bugs fish plants vegetables'},
  {'name': 'Kana Decks', value: 'hiragana katakana'},
  {'name': 'Japanese Misc. Decks', value: 'jptrivia common numbers hard haard insane yojijukugo kokuji onomato 擬音語 jpsyn jpsyn_hard jsyn jsynj ranobe radicals kklc jouyou images jpdefs'},
  {'name': 'Japanese Word Meaning Decks', value: 'N5m-mc N4m-mc N3m-mc N2m-mc N1m-mc 10km-mc 9km-mc 8km-mc 7km-mc 6km-mc 5km-mc 4km-mc 3km-mc j2km-mc 2km-mc j1km-mc 1km-mc animalsm-mc birdsm-mc bugsm-mc fishm-mc plantsm-mc vegetablesm-mc hardm-mc haardm-mc commonm-mc kokujim-mc kklcm-mc'},
  {'name': 'English Decks', value: 'defs1 defs2 defs3 (up to defs17)\nanagrams3 anagrams4 anagrams5 (up to anagrams10)\nejtrans ee en_syn'},
  {'name': 'Mixed Decks. The Grand Tour!', value: 'easymix medmix hardmix hardermix insanemix'},
];

module.exports.content = {
  embed: {
    title: 'Quiz',
    description: 'Say **k!quiz <deck name>** to start a quiz (Example: **k!quiz N5**). Say **k!quiz stop** to stop a quiz. Say **k!help quiz** to see advanced quiz help. Say **k!quiz save** to save your progress and **k!quiz load** to reload it. Say **k!quiz-conquest** or **k!quiz-inferno** to learn about these game types. Add **-mc** to the end of any deck name to make it multiple choice.',
    color: constants.EMBED_NEUTRAL_COLOR,
    fields: categoryFields,
    footer: {
      icon_url: constants.FOOTER_ICON_URI,
      text: 'You can mix any decks by using the + symbol. For example: k!quiz N5+N4+N3',
    },
  },
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
