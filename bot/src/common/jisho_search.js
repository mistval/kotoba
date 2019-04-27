const reload = require('require-reload')(require);

const jishoWordSearch = reload('./jisho_word_search.js');
const kanjiContentCreator = reload('./kanji_search_content_creator.js');
const strokeOrderContentCreator = reload('./stroke_order_content_creator.js');
const constants = reload('./constants.js');
const JishoDiscordContentFormatter = reload('./jisho_discord_content_formatter.js');
const createExampleSearchPages = require('./../discord/create_example_search_pages.js');
const addPaginationFooter = require('./../discord/add_pagination_footer.js');

const {
  NavigationChapter,
  Navigation,
} = require('monochrome-bot');

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
  constructor(authorName, kanjis, isStandalone, hasMultiplePages) {
    this.kanjis = kanjis;
    this.authorName = authorName;
    this.isStandalone = isStandalone;
    this.hasMultiplePages = hasMultiplePages;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  prepareData() {
  }

  async getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex < this.kanjis.length) {
      const content = await strokeOrderContentCreator.createContent(this.kanjis[pageIndex]);
      if (this.hasMultiplePages || !this.isStandalone) {
        return addFooter(this.authorName, content);
      }
      return content;
    }

    return undefined;
  }
}

class KanjiDataSource {
  constructor(authorName, kanjis, isStandalone, hasMultiplePages, prefix) {
    this.kanjis = kanjis;
    this.authorName = authorName;
    this.isStandalone = isStandalone;
    this.hasMultiplePages = hasMultiplePages;
    this.prefix = prefix;
  }

  // Nothing to do here, but we need the method due to
  // interface contract.
  // eslint-disable-next-line class-methods-use-this
  prepareData() {
  }

  async getPageFromPreparedData(arg, pageIndex) {
    if (pageIndex < this.kanjis.length) {
      const content = await kanjiContentCreator.createContent(this.kanjis[pageIndex], this.prefix);
      if (this.hasMultiplePages || !this.isStandalone) {
        return addFooter(this.authorName, content);
      }
      return content;
    }

    return undefined;
  }
}

class ExamplesSource {
  constructor(authorName, word) {
    this.word = word;
    this.authorName = authorName;
  }

  prepareData() {
    return createExampleSearchPages(this.word);
  }

  getPageFromPreparedData(pages, pageIndex) {
    return pages[pageIndex];
  }
}

function removeDuplicates(array) {
  if (!array) {
    return undefined;
  }

  return array.filter((element, i) => array.indexOf(element) === i);
}

function createNavigationChapterInformationForKanji(authorName, word, isStandalone, prefix) {
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
      hasMultiplePages,
      prefix,
    ));
  } else if (isStandalone) {
    navigationChapter = new NavigationChapter(new KanjiDataSource(
      authorName,
      word,
      isStandalone,
      hasMultiplePages,
      prefix,
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
      hasMultiplePages,
    ));
  } else if (isStandalone) {
    navigationChapter = new NavigationChapter(new StrokeOrderDataSource(
      authorName,
      word,
      isStandalone,
      hasMultiplePages,
    ));
  }

  return new NavigationChapterInformation(navigationChapter, hasMultiplePages, hasAnyPages);
}

function createNavigationChapterInformationForExamples(authorName, word) {
  const examplesSource = new ExamplesSource(authorName, word);
  const navigationChapter = new NavigationChapter(examplesSource);

  return navigationChapter;
}

function createNavigationForStrokeOrder(msg, authorName, authorId, kanji, navigationManager) {
  const navigationChapterInformation = createNavigationChapterInformationForStrokeOrder(
    authorName,
    kanji,
    true,
  );

  const chapterForEmojiName = {};
  chapterForEmojiName[STROKE_ORDER_EMOTE] = navigationChapterInformation.navigationChapter;

  const navigation = new Navigation(
    authorId,
    navigationChapterInformation.hasMultiplePages,
    STROKE_ORDER_EMOTE,
    chapterForEmojiName,
  );

  return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

function createNavigationForKanji(msg, authorName, authorId, kanji, navigationManager) {
  const navigationChapterInformation = createNavigationChapterInformationForKanji(
    authorName,
    kanji,
    true,
    msg.prefix,
  );

  const chapterForEmojiName = {};
  chapterForEmojiName[KANJI_EMOTE] = navigationChapterInformation.navigationChapter;

  const navigation = new Navigation(
    authorId,
    navigationChapterInformation.hasMultiplePages,
    KANJI_EMOTE,
    chapterForEmojiName,
  );

  return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

function createNavigationForJishoResults(
  msg,
  authorName,
  authorId,
  crossPlatformResponseData,
  navigationManager,
) {
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
    msg.prefix,
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
  );
  chapterForEmojiName[EXAMPLES_EMOTE] = examplesNavigationChapter;

  const navigation = new Navigation(authorId, true, JISHO_EMOTE, chapterForEmojiName);
  return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

async function createOnePageBigResultForWord(msg, word) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  const discordContents = JishoDiscordContentFormatter.formatJishoDataBig(
    crossPlatformResponseData,
    false,
  );

  const response = discordContents[0];
  return msg.channel.createMessage(response, null, msg);
}

async function createNavigationForWord(authorName, authorId, word, msg, navigationManager) {
  const crossPlatformResponseData = await jishoWordSearch(word);
  return createNavigationForJishoResults(
    msg,
    authorName,
    authorId,
    crossPlatformResponseData,
    navigationManager,
  );
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
  createSmallResultForWord,
  createOnePageBigResultForWord,
};
