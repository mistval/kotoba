
const reload = require('require-reload')(require);

const jishoWordSearch = reload('./jisho_word_search.js');
const kanjiContentCreator = reload('./kanji_search_content_creator.js');
const strokeOrderContentCreator = reload('./stroke_order_content_creator.js');
const examplesContentCreator = reload('./examples_content_creator.js');
const constants = reload('./constants.js');
const JishoDiscordContentFormatter = reload('./jisho_discord_content_formatter.js');
const {
  NavigationPage,
  NavigationChapter,
  Navigation,
  navigationManager,
} = reload('monochrome-bot');

const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
const STROKE_ORDER_EMOTE = '🇸';
const KANJI_EMOTE = '🇰';
const EXAMPLES_EMOTE = '🇪';
const JISHO_EMOTE = '🇯';

function addFooter(authorName, content) {
  if (!content) {
    return undefined;
  }

  const contentCopy = Object.assign({}, content);
  contentCopy.embed = Object.assign({}, content.embed);

  contentCopy.embed.footer = {
    icon_url: constants.FOOTER_ICON_URI,
    text: `${authorName} can use the reaction buttons below to see more information!`,
  };

  return contentCopy;
}

class NavigationChapterInformation {
  constructor(navigationChapter, hasMultiplePages, hasAnyPages) {
    this.navigationChapter = navigationChapter;
    this.hasMultiplePages = hasMultiplePages;
    this.hasAnyPages = hasAnyPages;
  }
}

class StrokeOrderDataSource {
  constructor(authorName, kanjis, isStandalone) {
    this.kanjis = kanjis;
    this.authorName = authorName;
    this.isStandalone = isStandalone;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  prepareData() {
  }

  getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex < this.kanjis.length) {
      return strokeOrderContentCreator.createContent(this.kanjis[pageIndex]).then((content) => {
        if (this.kanjis.length > 1 || !this.isStandalone) {
          return new NavigationPage(addFooter(this.authorName, content));
        }
        return new NavigationPage(content);
      });
    }

    return undefined;
  }
}

class KanjiDataSource {
  constructor(authorName, kanjis, isStandalone) {
    this.kanjis = kanjis;
    this.authorName = authorName;
    this.isStandalone = isStandalone;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  prepareData() {
  }

  getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex < this.kanjis.length) {
      return kanjiContentCreator.createContent(this.kanjis[pageIndex]).then((content) => {
        if (this.kanjis.length > 1 || !this.isStandalone) {
          return new NavigationPage(addFooter(this.authorName, content));
        }
        return new NavigationPage(content);
      });
    }

    return undefined;
  }
}

class ExamplesSource {
  constructor(authorName, word, isStandalone) {
    this.word = word;
    this.authorName = authorName;
    this.isStandalone = isStandalone;
  }

  prepareData() {
    return examplesContentCreator.createContent(this.word);
  }

  getPageFromPreparedData(arg, pageIndex) {
    let content = arg.toDiscordBotContent(pageIndex);
    let showPageArrows = false;
    if ((content && content.pages > 1) || !this.isStandalone) {
      content = addFooter(this.authorName, content);
      showPageArrows = true;
    }

    const page = new NavigationPage(content);
    page.showPageArrows = showPageArrows;

    return page;
  }
}

function removeDuplicates(array) {
  if (!array) {
    return undefined;
  }

  return array.filter((element, i) => array.indexOf(element) === i);
}

function createNavigationChapterInformationForKanji(authorName, word, isStandalone) {
  const kanjis = removeDuplicates(word.match(KANJI_REGEX));
  const pageCount = kanjis ? kanjis.length : 0;
  const hasMultiplePages = pageCount > 1;
  const hasAnyPages = pageCount > 0;
  let navigationChapter;

  if (kanjis && kanjis.length > 0) {
    navigationChapter = new NavigationChapter(new KanjiDataSource(
      authorName,
      kanjis,
      isStandalone,
    ));
  } else if (isStandalone) {
    navigationChapter = new NavigationChapter(new KanjiDataSource(
      authorName,
      word,
      isStandalone,
    ));
  }

  return new NavigationChapterInformation(navigationChapter, hasMultiplePages, hasAnyPages);
}

function createNavigationChapterInformationForStrokeOrder(authorName, word, isStandalone) {
  const kanjis = removeDuplicates(word.match(KANJI_REGEX));
  const pageCount = kanjis ? kanjis.length : 0;
  const hasMultiplePages = pageCount > 1;
  const hasAnyPages = pageCount > 0;
  let navigationChapter;

  if (kanjis && kanjis.length > 0) {
    navigationChapter = new NavigationChapter(new StrokeOrderDataSource(
      authorName,
      kanjis,
      isStandalone,
    ));
  } else if (isStandalone) {
    navigationChapter = new NavigationChapter(new StrokeOrderDataSource(
      authorName,
      word,
      isStandalone,
    ));
  }

  return new NavigationChapterInformation(navigationChapter, hasMultiplePages, hasAnyPages);
}

function createNavigationChapterInformationForExamples(authorName, word, isStandalone) {
  const navigationChapter = new NavigationChapter(new ExamplesSource(
    authorName,
    word,
    isStandalone,
  ));

  return new NavigationChapterInformation(navigationChapter);
}

function createNavigationForExamples(authorName, authorId, word) {
  const navigationChapterInformation =
    createNavigationChapterInformationForExamples(authorName, word, true);

  const chapterForEmojiName = {};
  chapterForEmojiName[EXAMPLES_EMOTE] = navigationChapterInformation.navigationChapter;
  return Promise.resolve(new Navigation(authorId, true, EXAMPLES_EMOTE, chapterForEmojiName));
}

function createNavigationForStrokeOrder(authorName, authorId, kanji) {
  const navigationChapterInformation = createNavigationChapterInformationForStrokeOrder(
    authorName,
    kanji,
    true,
  );

  const chapterForEmojiName = {};
  chapterForEmojiName[STROKE_ORDER_EMOTE] = navigationChapterInformation.navigationChapter;

  return Promise.resolve(new Navigation(
    authorId,
    navigationChapterInformation.hasMultiplePages,
    STROKE_ORDER_EMOTE,
    chapterForEmojiName,
  ));
}

function createNavigationForKanji(authorName, authorId, kanji) {
  const navigationChapterInformation = createNavigationChapterInformationForKanji(
    authorName,
    kanji,
    true,
  );

  const chapterForEmojiName = {};
  chapterForEmojiName[KANJI_EMOTE] = navigationChapterInformation.navigationChapter;

  return Promise.resolve(new Navigation(
    authorId,
    navigationChapterInformation.hasMultiplePages,
    KANJI_EMOTE,
    chapterForEmojiName,
  ));
}

function createNavigationForJishoResults(authorName, authorId, crossPlatformResponseData) {
  const word = crossPlatformResponseData.searchPhrase;
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    crossPlatformResponseData,
    true,
    true,
    authorName,
  );

  const jishoNavigationChapter = NavigationChapter.fromContent(discordContents);
  const chapterForEmojiName = {};
  chapterForEmojiName[JISHO_EMOTE] = jishoNavigationChapter;

  const kanjiNavigationChapterInformation = createNavigationChapterInformationForKanji(
    authorName,
    word,
    false,
  );
  if (kanjiNavigationChapterInformation.hasAnyPages) {
    chapterForEmojiName[KANJI_EMOTE] =
      kanjiNavigationChapterInformation.navigationChapter;
  }

  const strokeOrderNavigationChapterInformation = createNavigationChapterInformationForStrokeOrder(
    authorName,
    word,
    false,
  );
  if (strokeOrderNavigationChapterInformation.hasAnyPages) {
    chapterForEmojiName[STROKE_ORDER_EMOTE] =
      strokeOrderNavigationChapterInformation.navigationChapter;
  }

  const examplesNavigationChapter = createNavigationChapterInformationForExamples(
    authorName,
    word,
    false,
  ).navigationChapter;
  chapterForEmojiName[EXAMPLES_EMOTE] = examplesNavigationChapter;

  return new Navigation(authorId, true, JISHO_EMOTE, chapterForEmojiName);
}

async function createNavigationForWord(authorName, authorId, word, msg) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  const navigation = createNavigationForJishoResults(
    authorName,
    authorId,
    crossPlatformResponseData,
  );

  return navigationManager.register(navigation, 6000000, msg);
}

async function createSmallResultForWord(msg, word) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  const discordContent =
    JishoDiscordContentFormatter.formatJishoDataSmall(crossPlatformResponseData);

  return msg.channel.createMessage(discordContent, null, msg);
}

module.exports = {
  createNavigationForWord,
  createNavigationForJishoResults,
  createNavigationForKanji,
  createNavigationForStrokeOrder,
  createNavigationForExamples,
  createSmallResultForWord,
};
