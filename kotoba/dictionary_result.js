'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const assert = require('assert');
const constants = require('./constants.js');

const MaxPhraseMeanings = 999;

class DictionaryResult {
  constructor(targetLanguageWordsAndReadings, wordTags, wordMeanings) {

    if (!wordMeanings) {
      wordMeanings = [];
    }

    this.targetLanguageWordsAndReadings_ = targetLanguageWordsAndReadings;
    this.wordTags_ = wordTags;
    this.wordMeanings_ = wordMeanings;
  }

  getDiscordBotFieldLengthInRows() {
    return 1 + this.wordMeanings_.length;
  }

  toDiscordBotField() {
    let title = this.targetLanguageWordsAndReadings_.map(targetLanguageWordAndReadings => {
      let result = targetLanguageWordAndReadings.word;
      if (targetLanguageWordAndReadings.readings.length > 0) {
        result += ' (' + targetLanguageWordAndReadings.readings.join(', ') + ')';
      }
      return result;
    }).join(', ');

    let value;
    if (KotobaUtils.isNonEmptyArray(this.wordMeanings_)) {
      value = this.wordMeanings_.slice(0, MaxPhraseMeanings).map((meaning, index) => {
        return (index + 1) + '. ' + meaning.toDiscordBotString();
      }).join('\n');
    }

    if (value.length > 1024) {
      value = value.substring(0, 1010) + ' [...]';
    }

    return {name: title, value: value};
  }

  toStandaloneDiscordBotContent(searchedWord) {
    let content = {};
    let embed = {};
    content.embed = embed;
    content.embed.color = constants.EMBED_NEUTRAL_COLOR;
    content.embed.title = 'First Jisho result for: ' + searchedWord;
    content.embed.url = `http://jisho.org/search/${encodeURIComponent(searchedWord)}`;

    let fields = [];
    content.embed.fields = fields;
    let wordField = {name: 'Word', value: this.targetLanguageWordsAndReadings_[0].word, inline: true};
    fields.push(wordField);

    if (this.targetLanguageWordsAndReadings_[0].readings.length > 0) {
      let readingField = {name: 'Readings', value: this.targetLanguageWordsAndReadings_[0].readings.join(', '), inline: true};
      if (readingField.value) {
        fields.push(readingField);
      }
    }

    if (KotobaUtils.isNonEmptyArray(this.wordMeanings_)) {
      let meaningsString = this.wordMeanings_.slice(0, MaxPhraseMeanings).map((meaning, index) => {
        return (index + 1).toString() + '. ' + meaning.toDiscordBotString();
      }).join('\n');
      let meaningsField = {name: 'Meanings', value: meaningsString};
      fields.push(meaningsField);
    }

    return content;
  }
}

module.exports = DictionaryResult;
