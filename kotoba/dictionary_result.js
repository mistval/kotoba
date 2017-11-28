'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const assert = require('assert');
const constants = require('./constants.js');

const MaxPhraseMeanings = 3;

class DictionaryResult {
  constructor(targetLanguageWordResult, targetLanguageWordReadings, wordTags, wordMeanings) {
    KotobaUtils.assertIsString(targetLanguageWordResult);
    KotobaUtils.assertIsArray(wordTags, wordMeanings, targetLanguageWordReadings);

    this.targetLanguageWordResult_ = targetLanguageWordResult;
    this.targetLanguageWordReadings_ = targetLanguageWordReadings.filter(reading => !!reading);
    this.wordTags_ = wordTags;
    this.wordMeanings_ = wordMeanings;
  }

  toDiscordBotField() {
    let title = this.targetLanguageWordResult_;
    if (this.targetLanguageWordReadings_.length > 0) {
      title += '  (' + this.targetLanguageWordReadings_.join(', ') + ')';
    }
    title += ' ' + KotobaUtils.tagArrayToString(this.wordTags_);

    let value;
    if (KotobaUtils.isNonEmptyArray(this.wordMeanings_)) {
      value = this.wordMeanings_.slice(0, Math.min(this.wordMeanings_.length, MaxPhraseMeanings)).map((meaning, index) => {
        return (index + 1) + '. ' + meaning.toDiscordBotString();
      }).join('\n');
    }

    return {name: title, value: value};
  }

  toDiscordBotString() {
    let response = '- ' + this.targetLanguageWordResult_;
    if (this.targetLanguageWordReadings_.length > 0) {
      response += '  (' + this.targetLanguageWordReadings_.join(', ') + ')';
    }
    response += ' ' + KotobaUtils.tagArrayToString(this.wordTags_);

    if (KotobaUtils.isNonEmptyArray(this.wordMeanings_)) {
      response += '\n';
      response += this.wordMeanings_.slice(0, Math.min(this.wordMeanings_.length, MaxPhraseMeanings)).map((meaning, index) => {
        return '    *' + (index + 1) + '.* ' + meaning.toDiscordBotString();
      }).join('\n');
    }

    return response;
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
    let wordField = {name: 'Word', value: this.targetLanguageWordResult_, inline: true};
    fields.push(wordField);

    if (this.targetLanguageWordReadings_ && this.targetLanguageWordReadings_.length > 0) {
      let readingField = {name: 'Readings', value: this.targetLanguageWordReadings_.join(', '), inline: true};
      if (readingField.value) {
        fields.push(readingField);
      }
    }

    if (KotobaUtils.isNonEmptyArray(this.wordMeanings_)) {
      let meaningsString = this.wordMeanings_.slice(0, Math.min(this.wordMeanings_.length, MaxPhraseMeanings)).map((meaning, index) => {
        return (index + 1).toString() + '. ' + meaning.toDiscordBotString();
      }).join('\n');
      let meaningsField = {name: 'Meanings', value: meaningsString};
      fields.push(meaningsField);
    }

    return content;
  }
}

module.exports = DictionaryResult;
