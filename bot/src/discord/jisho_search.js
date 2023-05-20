const jishoWordSearch = require('../common/jisho_word_search.js');
const JishoDiscordContentFormatter = require('./jisho_discord_content_formatter.js');
const createExampleSearchPages = require('./create_example_search_pages.js');
const createKanjiSearchDataSource = require('./create_kanji_search_data_source.js');
const createStrokeOrderSearchNavigationChapter = require('./create_stroke_order_search_navigation_chapter.js');

class ExamplesSource {
  constructor(authorName, word) {
    this.word = word;
    this.authorName = authorName;
  }

  // eslint-disable-next-line class-methods-use-this
  async getPageFromPreparedData() {
    const pages = await createExampleSearchPages(this.word);
    return [...pages, undefined];
  }
}

function createNavigationChapterForKanji(authorName, word, prefix) {
  return createKanjiSearchDataSource(
    word,
    authorName,
    prefix,
    true,
  );
}

function createNavigationChapterInformationForStrokeOrder(authorName, word) {
  const navigationChapterInfo = createStrokeOrderSearchNavigationChapter(
    word,
    authorName,
    true,
  );

  const { navigationChapter, hasKanjiResults } = navigationChapterInfo;
  if (!hasKanjiResults) {
    return undefined;
  }

  return navigationChapter;
}

function createNavigationChapterInformationForExamples(authorName, word) {
  const examplesSource = new ExamplesSource(authorName, word);
  return examplesSource;
}

function createNavigationForJishoResults(
  msg,
  authorName,
  authorId,
  crossPlatformResponseData,
) {
  /* Create the Jisho (J) chapter */

  const word = crossPlatformResponseData.searchPhrase;
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    crossPlatformResponseData,
    true,
    true,
    authorName,
  );

  const jishoNavigationChapter = { title: '辞', pages: [...discordContents, undefined] };

  /* Create the Kanji (K) chapter */

  const kanjiDataSource = createNavigationChapterForKanji(
    authorName,
    word,
    msg.prefix,
  );

  const kanjiNavigationChapter = {
    title: '漢',
    getPages: (i) => kanjiDataSource.getPageFromPreparedData(undefined, i),
  };

  /* Create the stroke order (S) chapter */

  const strokeOrderDataSource = createNavigationChapterInformationForStrokeOrder(
    authorName,
    word,
    false,
  );

  const strokeOrderNavigationChapter = strokeOrderDataSource && {
    title: '書',
    getPages: (i) => strokeOrderDataSource.getPageFromPreparedData(undefined, i),
  };

  /* Create the examples (E) chapter */

  const examplesDataSource = createNavigationChapterInformationForExamples(
    authorName,
    word,
  );

  const examplesNavigationChapter = {
    title: '例',
    getPages: (i) => examplesDataSource.getPageFromPreparedData(undefined, i),
  };

  /* Create the navigation. */

  return [
    jishoNavigationChapter,
    kanjiNavigationChapter,
    strokeOrderNavigationChapter,
    examplesNavigationChapter,
  ].filter(Boolean);
}

async function createOnePageBigResultForWord(word) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    crossPlatformResponseData,
    false,
  );

  const response = discordContents[0];
  return response;
}

async function createNavigationForWord(authorName, authorId, word, msg) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  return createNavigationForJishoResults(
    msg,
    authorName,
    authorId,
    crossPlatformResponseData,
  );
}

async function createSmallResultForWord(word) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  const discordContent = JishoDiscordContentFormatter.formatJishoDataSmall(
    crossPlatformResponseData,
  );

  return discordContent;
}

module.exports = {
  createNavigationForWord,
  createNavigationForJishoResults,
  createSmallResultForWord,
  createOnePageBigResultForWord,
};
