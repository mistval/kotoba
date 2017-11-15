'use strict'
const reload = require('require-reload')(require)
const constants = reload('./../kotoba/constants.js');

module.exports = {
  'embed': {
    'title': 'Currently available quiz decks',
    'description': 'Say \'k!quiz [deck]\' to start a quiz (Example: k!quiz N4). Say \'k!help quiz\' to see advanced quiz options.',
    'color': constants.EMBED_NEUTRAL_COLOR,
    'fields': [
      {'name': 'JLPT', value: 'N5 N4 N3 N2 N1'},
      {'name': 'Kanken', value: 'kEasy 5k 4k 3k j2k 2k j1k 1k'},
      {'name': 'Japanese proper nouns', value: 'myouji namae onago places prefectures stations tokyo'},
      {'name': 'Kana', value: 'hiragana katakana'},
      {'name': 'Japanese Misc.', value: 'insane yojijukugo'},
      {'name': 'English', value: 'defs1 defs2 defs3 (up to defs17)'},
    ],
    footer: {
      'icon_url': constants.FOOTER_ICON_URI,
      'text': 'You can mix any decks by using the + symbol. For example: k!quiz N5+N4+N3',
    },
  },
};
