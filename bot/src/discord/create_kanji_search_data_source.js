const extractKanji = require('../common/util/extract_kanji.js');
const createKanjiSearchPage = require('./create_kanji_search_page.js');
const jishoKanjiSearch = require('../common/jisho_kanji_search.js');
const constants = require('../common/constants.js');

class KanjiNavigationDataSource {
  constructor(word, authorName, commandPrefix, forceNavigationFooter) {
    this.word = word;
    this.authorName = authorName;
    this.commandPrefix = commandPrefix;
    this.forceNavigationFooter = forceNavigationFooter;
  }

  async getKanjis() {
    let kanjis = extractKanji(this.word);
    if (kanjis.length === 0) {
      kanjis = await jishoKanjiSearch(this.word);
    }

    return kanjis;
  }

  async countPages() {
    this.kanjisAsync = this.kanjisAsync || this.getKanjis();
    return (await this.kanjisAsync).length;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  prepareData() {
  }

  async getPageFromPreparedData(arg, pageIndex) {
    this.kanjisAsync = this.kanjisAsync || this.getKanjis();
    const kanjis = await this.kanjisAsync;

    if (kanjis.length === 0) {
      return [{
        embeds: [{
          title: 'Jisho Kanji Search',
          description: `I didn't find any kanji results for ${this.word}.`,
          color: constants.EMBED_NEUTRAL_COLOR,
        }],
      }, undefined];
    }

    if (pageIndex >= kanjis.length) {
      return undefined;
    }

    const pageNumber = pageIndex + 1;
    const lastPageNumber = kanjis.length;

    const page = await createKanjiSearchPage(kanjis[pageIndex], this.commandPrefix);

    if (lastPageNumber > 1) {
      page.embeds[0].title += ` (page ${pageNumber} of ${lastPageNumber})`;
    }

    if (pageIndex === kanjis.length - 1) {
      return [page, undefined];
    }

    return page;
  }
}

function createKanjiSearchDataSource(
  searchQuery,
  authorName,
  commandPrefix,
  forceNavigationFooter,
) {
  const dataSource = new KanjiNavigationDataSource(
    searchQuery,
    authorName,
    commandPrefix,
    forceNavigationFooter,
  );

  return dataSource;
}

module.exports = createKanjiSearchDataSource;
