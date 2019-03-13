const reload = require('require-reload')(require);
const request = require('request-promise');
const { Navigation } = require('monochrome-bot');

const constants = reload('./constants.js');
const trimEmbed = reload('./util/trim_embed.js');
const { throwPublicErrorInfo, throwPublicErrorFatal } = reload('./util/errors.js');

const YOUREI_BASE_URL = 'https://yourei.jp/';

async function createNavigationForExamples(authorName, authorId, keyword, msg, navigationManager) {
    return msg.channel.createMessage(`${YOUREI_BASE_URL}${keyword} --${authorName}`);
}

module.exports = {
    createNavigationForExamples
}