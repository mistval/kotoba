'use strict'
const reload = require('require-reload')(require);
const assert = require('assert');
const KotobaUtils = reload('./utils.js');

class KanjiExample {
  constructor(kanji, english) {
    KotobaUtils.assertIsString(kanji, english);
    this.kanji = kanji;
    this.english = english.replace(/&#39;/g, '\'');
  }

  toDiscordBotString(maxChars) {
    let english = this.english;
    if (maxChars && english.length > maxChars) {
      english = english.substring(0, maxChars - 3) + '...';
    }
    return '**' + this.kanji + '**\n\t' + english;
  }
}

module.exports = KanjiExample;
