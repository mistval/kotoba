'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const logger = reload('monochrome-bot').logger;
const PublicError = reload('monochrome-bot').PublicError;
const searchForExamples = new (require('unofficial-jisho-api'))().searchForExamples;
const constants = require('./constants.js');

const MAX_EXAMPLE_RESULTS = 4;
const LONG_CUTOFF_IN_CHARS = 22;

class ExamplesResult {
  constructor(result) {
    this.parseResult(result);
  }

  parseResult(results) {
    let longExamples = [];
    let shortExamples = [];

    for (let result of results.results) {
      if (result.kanji.length > LONG_CUTOFF_IN_CHARS) {
        longExamples.push(result);
      } else {
        shortExamples.push(result);
      }
    }

    this.query_ = results.query;
    this.examples_ = shortExamples.concat(longExamples);
    this.uri_ = results.uri;
  }

  toDiscordBotContent(pageIndex) {
    if (this.examples_.length === 0) {
      return {
        pages: 0,
        embed: {
          title: 'Didn\'t find any examples for the word or phrase: ' + this.query_,
          description: `Did you search for **romaji**? Jisho's example search doesn't like romaji, try using hiragana and/or kanji!`,
          color: constants.EMBED_NEUTRAL_COLOR,
        },
      };
    }

    let exampleStart = pageIndex * MAX_EXAMPLE_RESULTS;
    if (exampleStart >= this.examples_.length) {
      return;
    }
    let exampleEnd = Math.min((pageIndex * MAX_EXAMPLE_RESULTS) + MAX_EXAMPLE_RESULTS, this.examples_.length);

    let fields = [];
    for (let i = exampleStart; i < exampleEnd; ++i) {
      let sentenceInformation = this.examples_[i];
      fields.push({name: sentenceInformation.kanji, value: sentenceInformation.kana + '\n' + sentenceInformation.english})
    }

    let numberOfPages = Math.floor((this.examples_.length / MAX_EXAMPLE_RESULTS) + 1);
    if (this.examples_.length % MAX_EXAMPLE_RESULTS === 0) {
      --numberOfPages;
    }

    return {
      found: true,
      pages: numberOfPages,
      embed: {
        title: 'Example results for ' + this.query_ + ` (page ${pageIndex + 1} of ${numberOfPages})`,
        url: this.uri_,
        fields: fields,
        color: constants.EMBED_NEUTRAL_COLOR,
      }
    }
  }
}

module.exports.createContent = function(word) {
  if (!word) {
    throw new Error('No word');
  }
  return searchForExamples(word).catch(err => {
    let embed = createTitleOnlyEmbed('Jisho is not responding. Please try again later.');
    throw PublicError.createWithCustomPublicMessage(embed, true, 'Jisho fetch fail', err);
  }).then(result => {
    return new ExamplesResult(result);
  });
};
