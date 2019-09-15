const { NavigationChapter } = require('monochrome-bot');
const extractKanji = require('../common/util/extract_kanji.js');
const createKanjiSearchPage = require('./create_kanji_search_page.js');
const addPaginationFooter = require('./add_pagination_footer.js');
const jishoKanjiSearch = require('./../common/jisho_kanji_search.js');
const constants = require('./../common/constants.js');

class KanjiNavigationDataSource {
  constructor(kanjis, authorName, commandPrefix, forceNavigationFooter) {
    this.kanjis = kanjis;
    this.authorName = authorName;
    this.commandPrefix = commandPrefix;
    this.forceNavigationFooter = forceNavigationFooter;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  prepareData() {
  }

  async getPageFromPreparedData(arg, pageIndex) {
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

async function createKanjiSearchNavigationChapter(
  searchQuery,
  authorName,
  commandPrefix,
  forceNavigationFooter,
) {
  let kanji = extractKanji(searchQuery);
  if (kanji.length === 0) {
    // const pages = [{
    //   embed: {
    //     title: 'Jisho Kanji Search',
    //     description: `I didn't find any kanji in your search query: ${searchQuery}. Try searching for some kanji.`,
    //     color: constants.EMBED_NEUTRAL_COLOR,
    //   },
    // }];

    // return {
    //   navigationChapter: NavigationChapter.fromContent(pages),
    //   pageCount: 1,
    //   hasResult: false,
    // };
    kanji = await jishoKanjiSearch(searchQuery);
  }

  const dataSource = new KanjiNavigationDataSource(
    kanji,
    authorName,
    commandPrefix,
    forceNavigationFooter,
  );

  return {
    navigationChapter: new NavigationChapter(dataSource),
    pageCount: kanji.length,
    hasResult: true,
  };
}

module.exports = createKanjiSearchNavigationChapter;
