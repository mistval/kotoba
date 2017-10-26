'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const assert = require('assert');

const MaxPhraseMeanings = 3;

class DictionaryResult {
  constructor(targetLanguageWordResult, targetLanguageWordReading, wordTags, wordMeanings) {
    KotobaUtils.assertIsString(targetLanguageWordResult, targetLanguageWordReading);
    KotobaUtils.assertIsArray(wordTags, wordMeanings);

    this.targetLanguageWordResult = targetLanguageWordResult;
    this.targetLanguageWordReading = targetLanguageWordReading;
    this.wordTags = wordTags;
    this.wordMeanings = wordMeanings;
  }

  toDiscordBotString() {
    let response = '- **' + this.targetLanguageWordResult + '**';

    if (this.targetLanguageWordReading !== '') {
      response += ' (' + this.targetLanguageWordReading + ')';
    }

    if (KotobaUtils.isNonEmptyArray(this.wordTags)) {
      response += ' ' + KotobaUtils.tagArrayToString(this.wordTags);
    }

    if (KotobaUtils.isNonEmptyArray(this.wordMeanings)) {
      response += '\n';
      response += this.wordMeanings.slice(0, Math.min(this.wordMeanings.length, MaxPhraseMeanings)).map((meaning, index) => {
        return '    *' + (index + 1) + '.* ' + meaning.toDiscordBotString();
      }).join('\n');
    }

    return response;
  }
}

module.exports = DictionaryResult;
