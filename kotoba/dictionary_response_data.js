'use strict'
const reload = require('require-reload')(require);
const ResponseStatus = reload('./dictionary_response_status.js');
const KotobaUtils = reload('./utils.js');
const assert = require('assert');

const MaxResultPhrases = 4;

class DictionaryResponseData {
  constructor() {
  }

  static CreateErrorResponse(errorMessage) {
    KotobaUtils.assertIsString(errorMessage);;
    let response = new DictionaryResponseData();
    response.responseStatus = ResponseStatus.RESULTS_ERROR;
    response.errorDetail = errorMessage;
    return response;
  }

  static CreateSyntaxErrorResponse(errorDetail) {
    KotobaUtils.assertIsString(errorDetail);
    let response = new DictionaryResponseData();
    response.responseStatus = ResponseStatus.INVALID_SYNTAX;
    response.errorDetail = errorDetail;
    return response;
  }

  static CreateNonErrorResponse(searchedWord, fromLanguagePretty, toLanguagePretty, showLanguages, dictionaryResults, extraText) {
    KotobaUtils.assertIsString(searchedWord, fromLanguagePretty, toLanguagePretty, extraText);
    KotobaUtils.assertIsBoolean(showLanguages);
    KotobaUtils.assertIsArray(dictionaryResults);
    let response = new DictionaryResponseData();
    response.dictionaryResults = dictionaryResults;
    response.extraText = extraText;
    response.fromLanguage = fromLanguagePretty;
    response.toLanguage = toLanguagePretty;
    response.showLanguages = showLanguages;
    response.searchedWord = searchedWord;

    if (KotobaUtils.isNonEmptyArray(dictionaryResults)) {
      response.responseStatus = ResponseStatus.OK;
    } else {
      response.responseStatus = ResponseStatus.NO_RESULTS;
    }

    return response;
  }

  toDiscordBotString() {
    let page = 0;
    let response = '';
    if (this.responseStatus === ResponseStatus.OK) {
      if (this.showLanguages) {
        response += this.toLanguage + ' results for the ' + this.fromLanguage + ' word or phrase: **' + this.searchedWord + '**';
      } else {
        response += 'Results for the word or phrase: **' + this.searchedWord + '**';
      }

      response += '\n\n';
      let startIndex = page * MaxResultPhrases;
      let endIndex = Math.min(this.dictionaryResults.length, startIndex + MaxResultPhrases);
      for (let i = startIndex; i < endIndex; ++i) {
        response += this.dictionaryResults[i].toDiscordBotString();

        if (i < endIndex - 1) {
          response += '\n';
        }
      }
    } else if (this.responseStatus === ResponseStatus.NO_RESULTS) {
      if (this.showLanguages) {
        response += 'Sorry, didn\'t find any ' + this.toLanguage + ' results for the ' + this.fromLanguage + ' word or phrase: **' + this.searchedWord + '**.';
      } else {
        response += 'Sorry, didn\'t find any results for the word or phrase: **' + this.searchedWord + '**.';
      }
    } else if (this.responseStatus === ResponseStatus.RESULT_ERROR) {
      response += 'Sorry, there was an error! ' + this.errorDetail;
    } else if (this.responseStatus === ResponseStatus.INVALID_SYNTAX) {
      response += this.errorDetail;
    }

    if (this.extraText) {
      response += '\n\n';
      response += this.extraText;
    }

    return response;
  }
}

module.exports = DictionaryResponseData;
