const reload = require('require-reload')(require);
const request = require('request-promise');
const cheerio = require('cheerio');
const { Navigation, NavigationChapter } = require('monochrome-bot');

const constants = reload('./constants.js');
const trimEmbed = reload('./util/trim_embed.js');
const { highlighter, highlight } = reload('./util/sentence_highlighter.js')
const { throwPublicErrorInfo, throwPublicErrorFatal } = reload('./util/errors.js');

const YOUREI_BASE_URL = 'http://yourei.jp/';
const SENTENCES_PER_FETCH = 20;

const EXAMPLES_PER_PAGE = 4;
const SENTENCES_EMOTE = '🇸';
const FULLCONTEXT_EMOTE = '🇫';
const USAGE_EMOTE = '🇺';

function getExampleSentences($) {
    return $('#sentence-example-list').find('li').map((idx, item) => {
        if (idx === SENTENCES_PER_FETCH) return undefined;
        const sentence = $(item)
            .children()
            .not('.next-sentence-preview')
            .find('rt')
            .replaceWith('')
            .end()
        return {
            short: sentence.filter('.the-sentence').text(), // The main sentence containing the word
            full: sentence.not('.sentence-source-title').text(), // Preceding or following sentences
            source: sentence.filter('.sentence-source-title').text() // From where the sentence is quoted
        }
    }).toArray();
}

function getExampleSentenceCount($) {
    return $('#num-examples').text();
}

function getUsageExamples($) {
    return $('#ingrams').find('li').map((idx, item) => {
        return $(item).text();
    }).toArray();
}

function getUsageFrequencies($) {
    return $('#next-freq-ngrams').find('a').map((idx, item) => {
        return $(item).text();
    }).toArray();
}

function getNextPageURI($) {
    return $('#sentence-next-pagenation-link').attr('href')
}

async function scrapeWebPage(keyword) {
    const targetURI = encodeURI(`${YOUREI_BASE_URL}${keyword}`);

    const options = {
        uri: targetURI,
        transform: body => cheerio.load(body)
    }

    return request(options)
        .then(($) => {
            return {
                data: {
                    sentences: getExampleSentences($),
                    usageFrequencies: getUsageFrequencies($),
                    usageExamples: getUsageExamples($),
                },
                meta: {
                    count: getExampleSentenceCount($),
                    keyword
                },
                links: {
                    next: getNextPageURI($),
                    self: targetURI
                }
            }
        })
        .catch((error) => {
            return throwPublicErrorFatal(
                '用例.jp', 
                'Sorry, yourei.jp isn\'t responding. Please try again later.', 
                'Error fetching from yourei.jp',
                error,
              );
        })
}

function formatSentenceData(sentences, keyword, showFullSentences = false) {
    return sentences.map((sentence) => {
        const highlighted = highlight(
            showFullSentences ? sentence.full : sentence.short, 
            showFullSentences ? sentence.short: keyword);
        return {
            name: highlighted,
            value: `-- ${sentence.source}`,
            inline: false
        }
    });
}

function createNavigationChapterForSentences(scrapeResult, authorName, showFullSentences) {
    const pages = [];
    const sentences = scrapeResult.data.sentences;
    const keyword = scrapeResult.meta.keyword;
    
    const fields = formatSentenceData(sentences, keyword, showFullSentences).reverse();

    let pageNumber = 1;
    const pageCount = Math.ceil(sentences.length / EXAMPLES_PER_PAGE);
    while(fields.length !== 0) {
        const embed = {
            title: `${keyword} - 用例.jp Search Results ${showFullSentences ? '(whole context)' : ''} (page ${pageNumber} of ${pageCount})`,
            url: scrapeResult.links.self,
            fields: [],
            color: constants.EMBED_NEUTRAL_COLOR,
            footer: {
                icon_url: constants.FOOTER_ICON_URI,
                text: `${authorName} can use the reaction buttons below to see more information!`,
            }
        }
        for (let i = 0; i < EXAMPLES_PER_PAGE; i++) {
            embed.fields.push(fields.pop());
        }
        pages.push(trimEmbed({ embed }));
        pageNumber++;
    }

    return NavigationChapter.fromContent(pages);
}

function createNavigationChapterForUsage(scrapeResult, authorName) {
    const keyword = scrapeResult.meta.keyword;

    const frequencyField = {
        name: 'Most frequent usage:',
        value: scrapeResult.data.usageFrequencies.join('\n'),
        inline: false
    };
    const usageExampleField = {
        name: `Usage examples:`,
        value: scrapeResult.data.usageExamples.join('・'),
        inline: false
    };

    embed = {
        title: `${keyword} - 用例.jp Search Results`,
        url: scrapeResult.links.self,
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: [frequencyField, usageExampleField],
        footer: {
            icon_url: constants.FOOTER_ICON_URI,
            text: `${authorName} can use the reaction buttons below to see more information!`,
        }
    }

    return NavigationChapter.fromContent([trimEmbed({ embed })]);
}

async function createNavigationForExamples(authorName, authorId, keyword, msg, navigationManager) {
    const searchResults = await scrapeWebPage(keyword);

    if (searchResults.data.sentences.length === 0) {
        return throwPublicErrorInfo('用例.jp', `I didn't find any results for **${keyword}**.`, 'No results');
    }

    const chapters = {}
    chapters[SENTENCES_EMOTE] = createNavigationChapterForSentences(searchResults, authorName, false);
    chapters[FULLCONTEXT_EMOTE] = createNavigationChapterForSentences(searchResults, authorName, true);
    chapters[USAGE_EMOTE] = createNavigationChapterForUsage(searchResults, authorName);
    
    const navigation = new Navigation(authorId, true, SENTENCES_EMOTE, chapters);
    return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

module.exports = {
    createNavigationForExamples
}