
const request = require('request-promise');
const cheerio = require('cheerio');
const { Navigation, NavigationChapter } = require('monochrome-bot');

const constants = require('./constants.js');
const trimEmbed = require('./util/trim_embed.js');
const { highlight } = require('./util/sentence_highlighter.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = require('./util/errors.js');

const YOUREI_BASE_URL = 'http://yourei.jp';
const SENTENCES_PER_FETCH = 20;

const EXAMPLES_PER_PAGE = 4;
const SENTENCES_EMOTE = '🇸';
const FULLTEXT_EMOTE = '🇫';
const USAGE_EMOTE = '🇺';

function getExampleSentences($) {
  return $('#sentence-example-list').find('li').map((idx, item) => {
    if (idx === SENTENCES_PER_FETCH) return undefined;
    const sentence = $(item)
      .children()
      .not('.next-sentence-preview')
      .find('rt')
      .replaceWith('')
      .end();
    return {
      short: sentence.filter('.the-sentence').text(), // The main sentence containing the word
      full: sentence.not('.sentence-source-title').text(), // Preceding or following sentences
      source: sentence.filter('.sentence-source-title').text(), // From where the sentence is quoted
    };
  }).toArray();
}

function getExampleSentenceCount($) {
  return $('#num-examples').text();
}

function getUsageExamples($) {
  return $('#ingrams').find('li').map((idx, item) => $(item).text()).toArray();
}

function getUsageFrequencies($) {
  return $('#next-freq-ngrams').find('a').map((idx, item) => $(item).text()).toArray();
}

function getNextPageURI($) {
  return encodeURI(`${YOUREI_BASE_URL}${$('#sentence-next-pagenation-link').attr('href') || ''}`);
}

async function scrapeWebPage(keyword) {
  const targetURI = encodeURI(`${YOUREI_BASE_URL}/${keyword}`);

  const options = {
    uri: targetURI,
    transform: body => cheerio.load(body),
  };

  return request(options)
    .then($ => ({
      data: {
        sentences: getExampleSentences($),
        usageFrequencies: getUsageFrequencies($),
        usageExamples: getUsageExamples($),
      },
      meta: {
        count: getExampleSentenceCount($),
        keyword,
      },
      links: {
        next: getNextPageURI($),
        self: targetURI,
      },
    }))
    .catch(error => throwPublicErrorFatal(
      '用例.jp',
      'Sorry, yourei.jp isn\'t responding. Please try again later.',
      'Error fetching from yourei.jp',
      error,
    ));
}

function formatSentenceData(sentences, keyword, showFullSentences = false) {
  return sentences.map((sentence) => {
    const highlighted = highlight(
      showFullSentences ? sentence.full : sentence.short,
      showFullSentences ? sentence.short : keyword,
    );
    return {
      name: highlighted,
      value: `-- ${sentence.source}`,
      inline: false,
    };
  });
}

function createNavigationChapterForSentences(scrapeResult, authorName, showFullSentences) {
  const pages = [];
  const {
    data: { sentences },
    meta: { count, keyword },
    links: { self, next },
  } = scrapeResult;

  const fields = formatSentenceData(sentences, keyword, showFullSentences).reverse();

  let pageNumber = 1;
  const pageCount = Math.ceil(sentences.length / EXAMPLES_PER_PAGE);
  while (fields.length !== 0) {
    const embed = {
      title: `${keyword} - 用例.jp Search Results ${showFullSentences ? '(whole context)' : ''} (page ${pageNumber} of ${pageCount})`,
      description: `Showing ${sentences.length} from ${count} sentences found. Visit [用例.jp](${next}) to see more sentences.`,
      url: self,
      fields: [],
      color: constants.EMBED_NEUTRAL_COLOR,
      footer: {
        icon_url: constants.FOOTER_ICON_URI,
        text: `${authorName} can use the reaction buttons below to see more information!`,
      },
    };
    for (let i = 0; i < EXAMPLES_PER_PAGE; i += 1) {
      if (fields.length !== 0) embed.fields.push(fields.pop());
    }
    pages.push(trimEmbed({ embed }));
    pageNumber += 1;
  }

  return NavigationChapter.fromContent(pages);
}

function createNavigationChapterForUsage(scrapeResult, authorName) {
  const {
    data: { usageFrequencies, usageExamples },
    meta: { keyword },
    links: { self },
  } = scrapeResult;

  const frequencyField = {
    name: 'Most frequent usage:',
    value: usageFrequencies.length !== 0 ? usageFrequencies.join('\n') : '-',
    inline: false,
  };
  const usageExampleField = {
    name: 'Usage examples:',
    value: usageExamples.length !== 0 ? usageExamples.join('・') : '-',
    inline: false,
  };

  const embed = {
    title: `${keyword} - 用例.jp Search Results`,
    url: self,
    color: constants.EMBED_NEUTRAL_COLOR,
    fields: [frequencyField, usageExampleField],
    footer: {
      icon_url: constants.FOOTER_ICON_URI,
      text: `${authorName} can use the reaction buttons below to see more information!`,
    },
  };

  return NavigationChapter.fromContent([trimEmbed({ embed })]);
}

async function createNavigationForExamples(authorName, authorId, keyword, msg, navigationManager) {
  const searchResults = await scrapeWebPage(keyword);

  if (searchResults.data.sentences.length === 0) {
    return throwPublicErrorInfo('用例.jp', `I didn't find any results for **${keyword}**.`, 'No results');
  }

  const chapters = {};
  chapters[SENTENCES_EMOTE] = createNavigationChapterForSentences(searchResults, authorName, false);
  chapters[FULLTEXT_EMOTE] = createNavigationChapterForSentences(searchResults, authorName, true);
  chapters[USAGE_EMOTE] = createNavigationChapterForUsage(searchResults, authorName);

  const navigation = new Navigation(authorId, true, SENTENCES_EMOTE, chapters);
  return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

module.exports = {
  createNavigationForExamples,
};
