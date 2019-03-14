const reload = require('require-reload')(require);
const request = require('request-promise');
const cheerio = require('cheerio');
const { Navigation } = require('monochrome-bot');

const constants = reload('./constants.js');
const trimEmbed = reload('./util/trim_embed.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = reload('./util/errors.js');

const YOUREI_BASE_URL = 'http://yourei.jp/';
const SENTENCES_PER_FETCH = 20;

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

function getUsageFrequency($) {
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
                    usageFrequency: getUsageFrequency($),
                    usageExamples: getUsageExamples($),
                },
                meta: {
                    count: getExampleSentenceCount($),
                    keyword
                },
                links: {
                    next: getNextPageURI($)
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

async function createNavigationForExamples(authorName, authorId, keyword, msg, navigationManager) {
    const result = await scrapeWebPage(keyword);
    return msg.channel.createMessage(`${YOUREI_BASE_URL}${keyword} --${authorName}`);
}

module.exports = {
    createNavigationForExamples
}