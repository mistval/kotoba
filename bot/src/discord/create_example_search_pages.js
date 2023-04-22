const UnofficialJishoApi = require('unofficial-jisho-api');
const ArrayUtil = require('../common/util/array.js');
const constants = require('../common/constants.js');
const { throwPublicErrorFatal } = require('../common/util/errors.js');

const jishoApi = new UnofficialJishoApi();

const MAX_RESULTS_PER_PAGE = 4;
const LONG_CUTOFF_IN_CHARS = 22;

function createPageTitle(query, pageIndex, pageCount) {
  const pageString = pageCount > 1 ? ` (page ${pageIndex + 1} of ${pageCount})` : '';
  return `Example results for ${query}${pageString}`;
}

function createPagesForExamplesData(examplesData) {
  if (!examplesData.found) {
    return [{
      embed: {
        url: examplesData.uri,
        title: 'Jisho Example Search',
        description: `I didn't find any example results for [${examplesData.query}](${examplesData.uri}).`,
        color: constants.EMBED_NEUTRAL_COLOR,
      },
    }, undefined];
  }

  const shortExamples = examplesData.results.filter(
    (result) => result.kanji.length < LONG_CUTOFF_IN_CHARS,
  );

  const longExamples = examplesData.results.filter(
    (result) => result.kanji.length >= LONG_CUTOFF_IN_CHARS,
  );

  const sortedExamples = shortExamples.concat(longExamples);
  const chunkedExamples = ArrayUtil.chunk(sortedExamples, MAX_RESULTS_PER_PAGE);

  const pages = chunkedExamples.map((examples, pageIndex) => ({
    embed: {
      url: examplesData.uri,
      title: createPageTitle(examplesData.query, pageIndex, chunkedExamples.length),
      color: constants.EMBED_NEUTRAL_COLOR,
      fields: examples.map((example) => ({
        name: example.kanji,
        value: `${example.kana}\n${example.english}`,
      })),
    },
  }));

  return pages;
}

async function createPages(word) {
  let examplesData;

  try {
    examplesData = await jishoApi.searchForExamples(word);
  } catch (err) {
    return throwPublicErrorFatal('Jisho Example Search', 'Jisho is not responding. Please try again later.', 'Jisho fetch fail', err);
  }

  return createPagesForExamplesData(examplesData);
}

module.exports = createPages;
