const { NavigationChapter } = require('monochrome-bot');
const extractKanji = require('../common/util/extract_kanji.js');
const createStrokeOrderSearchPage = require('./create_stroke_order_search_page.js');
const addPaginationFooter = require('./add_pagination_footer.js');

class StrokeOrderNavigationDataSource {
  constructor(characters, authorName, forceNavigationFooter) {
    this.characters = characters;
    this.authorName = authorName;
    this.forceNavigationFooter = forceNavigationFooter;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  prepareData() {
  }

  async getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex >= this.characters.length) {
      return undefined;
    }

    const pageNumber = pageIndex + 1;
    const lastPageNumber = this.characters.length;

    const page = await createStrokeOrderSearchPage(this.characters[pageIndex]);
    const pageCopy = { ...page, embed: { ...page.embed } };

    if (lastPageNumber > 1) {
      pageCopy.embed.title += ` (page ${pageNumber} of ${lastPageNumber})`;
    }

    if (this.characters.length > 1 || this.forceNavigationFooter) {
      return addPaginationFooter(pageCopy, this.authorName);
    }

    return pageCopy;
  }
}

function createStrokeOrderSearchNavigationChapter(searchQuery, authorName, forceNavigationFooter) {
  const kanji = extractKanji(searchQuery);
  const charactersToSearchFor = [ ...kanji ];
  if (kanji.length === 0) {
    const uniqueCharacters = searchQuery.split('').filter((c, i) => searchQuery.indexOf(c) === i);
    charactersToSearchFor.push(...uniqueCharacters);
  }

  const dataSource = new StrokeOrderNavigationDataSource(
    charactersToSearchFor,
    authorName,
    forceNavigationFooter,
  );

  return {
    navigationChapter: new NavigationChapter(dataSource),
    pageCount: charactersToSearchFor.length,
    hasKanjiResults: kanji.length > 0,
  };
}

module.exports = createStrokeOrderSearchNavigationChapter;
