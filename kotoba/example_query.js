'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const logger = require('./../core/logger.js');

const MAX_EXAMPLE_RESULTS = 3;
const LONG_CUTOFF_IN_CHARS = 30;

function createDiscordBotResponse(language, suffix, results) {
  let response = '';

  if (results.sentenceInformation.length === 0) {
    response += 'Sorry! Didn\'t find any results for the Japanese word or phrase: **' + suffix + '**';
  } else {
    response += 'Example results for the word or phrase: **' + suffix + '**\n\n';
    response += '```glsl\n';
    let longExamples = [];
    let shortExamples = [];

    for (let i = 0; i < results.sentenceInformation.length && shortExamples.length < MAX_EXAMPLE_RESULTS; ++i) {
      let sentenceInformation = results.sentenceInformation[i];
      if (sentenceInformation.kanjiLine.length > LONG_CUTOFF_IN_CHARS) {
        longExamples.push(sentenceInformation);
      } else {
        shortExamples.push(sentenceInformation);
      }
    }

    let combinedExamples = shortExamples.concat(longExamples);

    for (let i = 0; i < MAX_EXAMPLE_RESULTS && i < combinedExamples.length; ++i) {
      let result = combinedExamples[i];
      response += '#' + result.kanjiLine + '\n';
      response += ' ' + result.kanaLine + '\n';
      response += ' ' + result.englishLine;

      if (i !== MAX_EXAMPLE_RESULTS - 1) {
        response += '\n\n';
      }
    }

    response += '\n```';

    if (results.extra) {
      response += '\n' + results.extra;
    }
  }

  return response;
}

function printHelp(bot, msg) {
  msg.channel.createMessage('Say \'k!ex [phrase] to search for Japanese example sentences containing a word or phrase.');
}

module.exports = function(language, suffix, queryFunction, bot, msg) {
  if (suffix === '') {
    printHelp(bot, msg);
  } else {
    return queryFunction(language, suffix).then(result => {
      let botResponse = createDiscordBotResponse(language, suffix, result);
      return msg.channel.createMessage(botResponse);
    });
  }
};
