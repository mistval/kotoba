'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const assert = require('assert');
const constants = require('./constants.js');

const MaxResultPhrases = 4;

class DictionaryResponseData {
  constructor(searchedWord, fromLanguagePretty, toLanguagePretty, showLanguages, dictionaryResults, extraText, embedUrl) {
    KotobaUtils.assertIsString(searchedWord, fromLanguagePretty, toLanguagePretty, extraText);
    KotobaUtils.assertIsBoolean(showLanguages);
    KotobaUtils.assertIsArray(dictionaryResults);
    this.dictionaryResults_ = dictionaryResults;
    this.extraText_ = extraText;
    this.fromLanguage_ = fromLanguagePretty;
    this.toLanguage_ = toLanguagePretty;
    this.showLanguages_ = showLanguages;
    this.searchedWord_ = searchedWord;
    this.embedUrl_ = embedUrl;
  }

  getNumberOfPages() {
    let lastPageIndex = Math.floor(this.dictionaryResults_.length / MaxResultPhrases);
    if (this.dictionaryResults_.length % MaxResultPhrases === 0) {
      --lastPageIndex;
    }
    return lastPageIndex + 1;
  }

  toDiscordBotContent(large, page) {
    if (this.dictionaryResults_.length < 1) {
      if (this.showLanguages_) {
        return 'Sorry, didn\'t find any ' + this.toLanguage_ + ' results for the ' + this.fromLanguage_ + ' word or phrase: **' + this.searchedWord_ + '**.';
      } else {
        return 'Sorry, didn\'t find any results for the word or phrase: **' + this.searchedWord_ + '**.';
      }
    }

    if (large) {
      return this.toDiscordBotContentLarge_(page);
    } else {
      return this.toDiscordBotContentSmall_();
    }

    return response;
  }

  toDiscordBotContentLarge_(page) {
    if (page >= this.getNumberOfPages()) {
      return undefined;
    }
    let embed = {};
    embed.color = constants.EMBED_NEUTRAL_COLOR;
    page = page || 0;
    if (this.showLanguages_) {
      embed.title = 'Results for ' + this.searchedWord_ + ` (${this.fromLanguage_} > ${this.toLanguage_})`;
    } else {
      embed.title = 'Results for ' + this.searchedWord_ + ` (Page ${page + 1} of ${this.getNumberOfPages()})`;
    }

    if (this.embedUrl_) {
      embed.url = this.embedUrl_;
    }

    let startIndex = page * MaxResultPhrases;
    let endIndex = Math.min(this.dictionaryResults_.length, startIndex + MaxResultPhrases);
    embed.fields = [];
    for (let i = startIndex; i < endIndex; ++i) {
      embed.fields.push(this.dictionaryResults_[i].toDiscordBotField());
    }

    return {embed: embed};
  }

  toDiscordBotContentSmall_() {
    return this.dictionaryResults_[0].toStandaloneDiscordBotContent(this.searchedWord_);
  }
}

module.exports = DictionaryResponseData;
