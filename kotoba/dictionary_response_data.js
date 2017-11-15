'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const assert = require('assert');
const constants = require('./constants.js');

const MaxResultPhrases = 4;

class DictionaryResponseData {
  constructor(searchedWord, fromLanguagePretty, toLanguagePretty, showLanguages, dictionaryResults, extraText) {
    KotobaUtils.assertIsString(searchedWord, fromLanguagePretty, toLanguagePretty, extraText);
    KotobaUtils.assertIsBoolean(showLanguages);
    KotobaUtils.assertIsArray(dictionaryResults);
    this.dictionaryResults_ = dictionaryResults;
    this.extraText_ = extraText;
    this.fromLanguage_ = fromLanguagePretty;
    this.toLanguage_ = toLanguagePretty;
    this.showLanguages_ = showLanguages;
    this.searchedWord_ = searchedWord;
  }

  toDiscordBotContent(large) {
    if (this.dictionaryResults_.length < 1) {
      if (this.showLanguages_) {
        return 'Sorry, didn\'t find any ' + this.toLanguage_ + ' results for the ' + this.fromLanguage_ + ' word or phrase: **' + this.searchedWord_ + '**.';
      } else {
        return 'Sorry, didn\'t find any results for the word or phrase: **' + this.searchedWord_ + '**.';
      }
    }

    if (large) {
      return this.toDiscordBotContentLarge_();
    } else {
      return this.toDiscordBotContentSmall_();
    }

    return response;
  }

  toDiscordBotContentLarge_() {
    let page = 0;
    let response = '';
    if (this.showLanguages_) {
      response += this.toLanguage_ + ' results for the ' + this.fromLanguage_ + ' word or phrase: **' + this.searchedWord_ + '**';
    } else {
      response += 'Results for the word or phrase: **' + this.searchedWord_ + '**';
    }

    response += '\n\n';
    let startIndex = page * MaxResultPhrases;
    let endIndex = Math.min(this.dictionaryResults_.length, startIndex + MaxResultPhrases);
    for (let i = startIndex; i < endIndex; ++i) {
      response += this.dictionaryResults_[i].toDiscordBotString();

      if (i < endIndex - 1) {
        response += '\n';
      }
    }

    if (this.extraText_) {
      response += '\n\n';
      response += this.extraText_;
    }

    return response;
  }

  toDiscordBotContentSmall_() {
    return this.dictionaryResults_[0].toStandaloneDiscordBotContent(this.searchedWord_);
  }
}

module.exports = DictionaryResponseData;
