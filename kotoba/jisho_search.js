
const reload = require('require-reload')(require);

const jishoWordSearch = reload('./jisho_word_search.js');
const kanjiContentCreator = reload('./kanji_search_content_creator.js');
const strokeOrderContentCreator = reload('./stroke_order_content_creator.js');
const NavigationPage = reload('monochrome-bot').NavigationPage;
const NavigationChapter = reload('monochrome-bot').NavigationChapter;
const examplesContentCreator = reload('./examples_content_creator.js');
const Navigation = reload('monochrome-bot').Navigation;
const constants = reload('./constants.js');
const JishoDiscordContentFormatter = reload('./jisho_discord_content_formatter.js');

const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
const STROKE_ORDER_EMOTE = '🇸';
const KANJI_EMOTE = '🇰';
const EXAMPLES_EMOTE = '🇪';
const JISHO_EMOTE = '🇯';

function addFooter(authorName, content) {
  if (!content) {
    return;
  }
  content.embed.footer = {
    icon_url: constants.FOOTER_ICON_URI,
    text: `${authorName} can use the reaction buttons below to see more information!`,
  };
}

class StrokeOrderDataSource {
  constructor(authorName, kanjis, isStandalone) {
    if (typeof kanjis === typeof '') {
      kanjis = [kanjis];
    }
    this.kanjis_ = kanjis;
    this.authorName_ = authorName;
    this.isStandalone_ = isStandalone;
  }

  prepareData() {
  }

  getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex < this.kanjis_.length) {
      return strokeOrderContentCreator.createContent(this.kanjis_[pageIndex]).then((content) => {
        if (this.kanjis_.length > 1 || !this.isStandalone_) {
          addFooter(this.authorName_, content);
        }
        return new NavigationPage(content);
      });
    }
  }
}

class KanjiDataSource {
  constructor(authorName, kanjis, isStandalone) {
    if (typeof kanjis === typeof '') {
      kanjis = [kanjis];
    }
    this.kanjis_ = kanjis;
    this.authorName_ = authorName;
    this.isStandalone_ = isStandalone;
  }

  prepareData() {

  }

  getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex < this.kanjis_.length) {
      return kanjiContentCreator.createContent(this.kanjis_[pageIndex]).then((content) => {
        if (this.kanjis_.length > 1 || !this.isStandalone_) {
          addFooter(this.authorName_, content);
        }
        return new NavigationPage(content);
      });
    }
  }
}

class JishoWordDataSource {
  constructor(authorName, dictionaryResponseData) {
    this.dictionaryResponseData_ = dictionaryResponseData;
    this.authorName_ = authorName;
  }

  prepareData() {
  }

  getPageFromPreparedData(arg, pageIndex) {
    const responseContent = this.dictionaryResponseData_.toDiscordBotContent(true, pageIndex);
    addFooter(this.authorName_, responseContent);
    if (!responseContent) {
      return;
    }
    return new NavigationPage(responseContent);
  }
}

class ExamplesSource {
  constructor(authorName, word) {
    this.word_ = word;
    this.authorName_ = authorName;
  }

  prepareData() {
    return examplesContentCreator.createContent(this.word_);
  }

  getPageFromPreparedData(arg, pageIndex) {
    const content = arg.toDiscordBotContent(pageIndex);
    const page = new NavigationPage(content);
    if (content && content.pages > 1) {
      addFooter(this.authorName_, content);
    } else {
      page.showPageArrows = false;
    }
    return page;
  }
}

function removeDuplicates(array) {
  if (!array) {
    return;
  }
  return array.filter((element, i) => array.indexOf(element) === i);
}

function addNavigationChapterForKanji(authorName, word, chapterForEmojiName, isStandalone) {
  const kanjis = removeDuplicates(word.match(KANJI_REGEX));
  if (kanjis && kanjis.length > 0) {
    chapterForEmojiName[KANJI_EMOTE] = new NavigationChapter(new KanjiDataSource(authorName, kanjis, isStandalone));
  } else if (isStandalone) {
    chapterForEmojiName[KANJI_EMOTE] = new NavigationChapter(new KanjiDataSource(authorName, word, isStandalone));
  }
  return kanjis ? kanjis.length : 0;
}

function addNavigationChapterForStrokeOrder(authorName, word, chapterForEmojiName, isStandalone) {
  const kanjis = removeDuplicates(word.match(KANJI_REGEX));
  if (kanjis && kanjis.length > 0) {
    chapterForEmojiName[STROKE_ORDER_EMOTE] = new NavigationChapter(new StrokeOrderDataSource(authorName, kanjis, isStandalone));
  } else if (isStandalone) {
    chapterForEmojiName[STROKE_ORDER_EMOTE] = new NavigationChapter(new StrokeOrderDataSource(authorName, word, isStandalone));
  }

  return kanjis ? kanjis.length : 0;
}

function addNavigationChapterForExamples(authorName, word, chapterForEmojiName) {
  chapterForEmojiName[EXAMPLES_EMOTE] = new NavigationChapter(new ExamplesSource(authorName, word));
}

function createNavigationForExamples(authorName, authorId, word) {
  const chapterForEmojiName = {};
  addNavigationChapterForExamples(authorName, word, chapterForEmojiName);
  return Promise.resolve(new Navigation(authorId, true, EXAMPLES_EMOTE, chapterForEmojiName));
}

function createNavigationForStrokeOrder(authorName, authorId, kanji) {
  const chapterForEmojiName = {};

  const pageCount = addNavigationChapterForStrokeOrder(
    authorName,
    kanji,
    chapterForEmojiName,
    true,
  );

  return Promise.resolve(new Navigation(
    authorId,
    pageCount > 1,
    STROKE_ORDER_EMOTE,
    chapterForEmojiName,
  ));
}

function createNavigationForKanji(authorName, authorId, kanji) {
  const chapterForEmojiName = {};
  const pageCount = addNavigationChapterForKanji(authorName, kanji, chapterForEmojiName, true);
  return Promise.resolve(new Navigation(authorId, pageCount > 1, KANJI_EMOTE, chapterForEmojiName));
}

function createNavigationForJishoResults(authorName, authorId, crossPlatformResponseData) {
  const word = crossPlatformResponseData.searchPhrase;
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    crossPlatformResponseData,
    true,
    authorName,
  );

  const navigationChapter = NavigationChapter.fromContent(discordContents);
  const chapterForEmojiName = {};
  chapterForEmojiName[JISHO_EMOTE] = navigationChapter;
  addNavigationChapterForKanji(authorName, word, chapterForEmojiName);
  addNavigationChapterForStrokeOrder(authorName, word, chapterForEmojiName);
  addNavigationChapterForExamples(authorName, word, chapterForEmojiName);
  return new Navigation(authorId, true, JISHO_EMOTE, chapterForEmojiName);
}

async function createNavigationForWord(authorName, authorId, word) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  return createNavigationForJishoResults(authorName, authorId, crossPlatformResponseData);
}

module.exports = {
  createNavigationForWord,
  createNavigationForJishoResults,
  createNavigationForKanji,
  createNavigationForStrokeOrder,
  createNavigationForExamples,
};
