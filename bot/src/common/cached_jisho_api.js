const UnofficialJishoApi = require('unofficial-jisho-api');
const { cache } = require('kotoba-node-common');

const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

const jishoApi = new UnofficialJishoApi();

function searchForPhrase(phrase) {
  return cache.getCachedInDatabase(
    `jisho_search:${phrase}`,
    NINETY_DAYS_IN_SECONDS,
    () => jishoApi.searchForPhrase(phrase),
  );
}

function searchForExamples(phrase) {
  return cache.getCachedInDatabase(
    `jisho_examples:${phrase}`,
    NINETY_DAYS_IN_SECONDS,
    () => jishoApi.searchForExamples(phrase),
  );
}

function searchForKanji(kanji) {
  return cache.getCachedInDatabase(
    `jisho_kanji:${kanji}`,
    NINETY_DAYS_IN_SECONDS,
    () => jishoApi.searchForKanji(kanji),
  );
}

const getUriForKanjiSearch = jishoApi.getUriForKanjiSearch.bind(jishoApi);

module.exports = {
  searchForPhrase,
  searchForExamples,
  searchForKanji,
  getUriForKanjiSearch,
};
