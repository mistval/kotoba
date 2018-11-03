const reload = require('require-reload')(require);
const UnofficialJishoApi = require('unofficial-jisho-api');

const constants = reload('./constants.js');
const { throwPublicErrorFatal } = reload('./util/errors.js');

const jishoApi = new UnofficialJishoApi();

const MAX_EXAMPLE_RESULTS = 4;
const LONG_CUTOFF_IN_CHARS = 22;

class ExamplesResult {
  constructor(result) {
    this.parseResult(result);
  }

  parseResult(results) {
    const longExamples = [];
    const shortExamples = [];

    results.results.forEach((result) => {
      if (result.kanji.length > LONG_CUTOFF_IN_CHARS) {
        longExamples.push(result);
      } else {
        shortExamples.push(result);
      }
    });

    this.query = results.query;
    this.examples = shortExamples.concat(longExamples);
    this.uri = results.uri;
  }

  toDiscordBotContent(pageIndex) {
    if (this.examples.length === 0) {
      return {
        pages: 0,
        embed: {
          title: `Didn't find any examples for the word or phrase: ${this.query}`,
          description: 'Did you search for **romaji**? Jisho\'s example search doesn\'t like romaji, try using hiragana and/or kanji!',
          color: constants.EMBED_NEUTRAL_COLOR,
        },
      };
    }

    const exampleStart = pageIndex * MAX_EXAMPLE_RESULTS;
    if (exampleStart >= this.examples.length) {
      return undefined;
    }

    const exampleEnd = Math.min(
      (pageIndex * MAX_EXAMPLE_RESULTS) + MAX_EXAMPLE_RESULTS,
      this.examples.length,
    );

    const fields = [];
    for (let i = exampleStart; i < exampleEnd; i += 1) {
      const sentenceInformation = this.examples[i];
      fields.push({ name: sentenceInformation.kanji, value: `${sentenceInformation.kana}\n${sentenceInformation.english}` });
    }

    let numberOfPages = Math.floor((this.examples.length / MAX_EXAMPLE_RESULTS) + 1);
    if (this.examples.length % MAX_EXAMPLE_RESULTS === 0) {
      numberOfPages -= 1;
    }

    return {
      found: true,
      pages: numberOfPages,
      embed: {
        title: `Example results for ${this.query} (page ${pageIndex + 1} of ${numberOfPages})`,
        url: this.uri,
        fields,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    };
  }
}

async function createContent(word) {
  if (!word) {
    throw new Error('No word');
  }
  try {
    const result = await jishoApi.searchForExamples(word);
    return new ExamplesResult(result);
  } catch (err) {
    return throwPublicErrorFatal('Examples', 'Jisho is not responding. Please try again later.', 'Jisho fetch fail', err);
  }
}

module.exports = {
  createContent,
};
