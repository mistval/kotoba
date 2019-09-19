const { NavigationChapter } = require('monochrome-bot');
const extractKanji = require('../common/util/extract_kanji.js');
const createKanjiSearchPage = require('./create_kanji_search_page.js');
const addPaginationFooter = require('./add_pagination_footer.js');
const jishoKanjiSearch = require('./../common/jisho_kanji_search.js');
const constants = require('./../common/constants.js');

class KanjiNavigationDataSource {
  constructor(word, authorName, commandPrefix, forceNavigationFooter) {
    this.word = word
    this.kanjis = extractKanji(word);
    this.authorName = authorName;
    this.commandPrefix = commandPrefix;
    this.forceNavigationFooter = forceNavigationFooter;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  async prepareData() {
    if (this.kanjis.length === 0) {
      this.kanjis = await jishoKanjiSearch(this.word);
    }
    this.hasResult = this.kanjis.length > 0;
  }

  async getPageFromPreparedData(arg, pageIndex) {
    if (!this.hasResult) {
      return {
        embed: {
          title: 'Jisho Kanji Search',
          description: `I didn't find any results for ${this.word}`,
          color: constants.EMBED_NEUTRAL_COLOR,
        },
      };
    }

    if (pageIndex >= this.kanjis.length) {
      return undefined;
    }

    const pageNumber = pageIndex + 1;
    const lastPageNumber = this.kanjis.length;

    const page = await createKanjiSearchPage(this.kanjis[pageIndex], this.commandPrefix);
    const pageCopy = { ...page, embed: { ...page.embed } };

    if (lastPageNumber > 1) {
      pageCopy.embed.title += ` (page ${pageNumber} of ${lastPageNumber})`;
    }

    if (this.kanjis.length > 1 || this.forceNavigationFooter) {
      return addPaginationFooter(pageCopy, this.authorName);
    }

    return pageCopy;
  }
}

function createKanjiSearchNavigationChapter(
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

  return {
    navigationChapter: new NavigationChapter(dataSource),
    pageCount: 2, //TODO: How to get these values?
    hasResult: true //
  };
}

module.exports = createKanjiSearchNavigationChapter;
