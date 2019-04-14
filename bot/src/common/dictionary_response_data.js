/*
 * This code is no longer maintained.
 * It is still used for Glosbe dictionary searches.
 * If it breaks, the Glosbe dictionary search
 * feature may be removed from the bot.
 */

const constants = require('./constants.js');

const MaxLinesPerPage = 11;

class DictionaryResponseData {
  constructor(searchedWord, fromLanguagePretty, toLanguagePretty, showLanguages, dictionaryResults, extraText, embedUrl) {
    this.dictionaryResults_ = dictionaryResults;
    this.hasResults = this.dictionaryResults_ && this.dictionaryResults_.length > 0;
    this.extraText_ = extraText;
    this.fromLanguage_ = fromLanguagePretty;
    this.toLanguage_ = toLanguagePretty;
    this.showLanguages_ = showLanguages;
    this.searchedWord_ = searchedWord;
    this.searchedWord = this.searchedWord_;
    this.embedUrl_ = embedUrl;
    this.resultsCache_ = {};
  }

  getNumberOfPages() {
    let pageIndex = 0;
    while (this.getResultsForPage_(pageIndex).length > 0) {
      ++pageIndex;
    }
    return pageIndex;
  }

  getResultsForPage_(targetPageIndex) {
    if (this.resultsCache_[targetPageIndex]) {
      return this.resultsCache_[targetPageIndex];
    }
    let thisPageIndex = 0;
    let linesOnThisPage = 0;
    let results = [];
    for (let result of this.dictionaryResults_) {
      let linesForThisResult = result.getDiscordBotFieldLengthInRows();
      if (linesOnThisPage + linesForThisResult > MaxLinesPerPage && linesOnThisPage > 0) {
        ++thisPageIndex;
        linesOnThisPage = 0;
      }
      if (thisPageIndex === targetPageIndex) {
        results.push(result);
        this.resultsCache_[thisPageIndex] = results;
      }
      if (thisPageIndex > targetPageIndex) {
        return results;
      }
      linesOnThisPage += linesForThisResult;
    }

    return results;
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

    embed.fields = [];
    for (let result of this.getResultsForPage_(page)) {
      embed.fields.push(result.toDiscordBotField());
    }

    return {embed: embed};
  }

  toDiscordBotContentSmall_() {
    return this.dictionaryResults_[0].toStandaloneDiscordBotContent(this.searchedWord_);
  }
}

module.exports = DictionaryResponseData;
