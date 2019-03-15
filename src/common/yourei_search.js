const reload = require('require-reload')(require);
const request = require('request-promise');
const cheerio = require('cheerio');
const { Navigation, NavigationChapter } = require('monochrome-bot');

const constants = reload('./constants.js');
const trimEmbed = reload('./util/trim_embed.js');
const highlight = reload('./util/sentence_highlighter.js')
const { throwPublicErrorInfo, throwPublicErrorFatal } = reload('./util/errors.js');

const YOUREI_BASE_URL = 'http://yourei.jp/';
const SENTENCES_PER_FETCH = 20;

const EXAMPLES_PER_PAGE = 4;
const SENTENCES_EMOTE = '🇸';
const FREQUENCY_EMOTE = '🇫';
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
                'Yourei', 
                'Sorry, yourei.jp isn\'t responding. Please try again later.', 
                'Error fetching from yourei.jp',
                error,
              );
        })
}

function createNavigationChapterForSentences(sentences) {
    const pages = [];
    
    const fields = sentences.map((sentence) => {
        return {
            value: `${sentence.full}\n-`,
            name: sentence.source,
            inline: false
        }
    })

    while(fields.length !== 0) {
        const embed = {
            title: 'Yourei',
            color: constants.EMBED_NEUTRAL_COLOR,
            fields: [],
        }
        for (let i = 0; i < EXAMPLES_PER_PAGE; i++) {
            embed.fields.push(fields.pop());
        }
        pages.push(trimEmbed({ embed }));
    }

    return NavigationChapter.fromContent(pages);
}

function createNavigationChapterForFrequency(usageFrequencies) {
    const content = {
        embed: {
            title: 'Usage Frequency',
            description: 'Word usage frequecy chapter scaffolding'
        }
    }

    return NavigationChapter.fromContent([content]);
}

function createNavigationChapterForUsage(usageExamples) {
    const content = {
        embed: {
            title: 'Usage Examples',
            description: 'Word usage examples chapter scaffolding'
        }
    }

    return NavigationChapter.fromContent([content]);
}

async function createNavigationForExamples(authorName, authorId, keyword, msg, navigationManager) {
    const result = await scrapeWebPage(keyword);

    const chapters = {}
    chapters[SENTENCES_EMOTE] = createNavigationChapterForSentences(result.data.sentences);
    chapters[FREQUENCY_EMOTE] = createNavigationChapterForFrequency();
    chapters[USAGE_EMOTE] = createNavigationChapterForUsage();
    
    const navigation = new Navigation(authorId, true, SENTENCES_EMOTE, chapters);
    return navigationManager.show(navigation, constants.NAVIGATION_EXPIRATION_TIME, msg.channel, msg);
}

module.exports = {
    createNavigationForExamples
}