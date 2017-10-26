'use strict'
const reload = require('require-reload')(require);
const jishoScreenScraper = reload('./jisho_screen_scraper.js');
const constants = reload('./constants.js');

const MAXIMUM_EXAMPLE_COUNT = 3;
const MAXIMUM_EXAMPLE_LENGTH_IN_CHARS = 500;

function getMeaningsString(meaningsArray) {
  let meaningsString = '';
  for (let i = 0; i < meaningsArray.length; ++i) {
    meaningsString += meaningsArray[i];

    if (i < meaningsArray.length - 1) {
      meaningsString += ', ';
      if (i >= 2 && i % 2 === 0) {
        meaningsString += '\n';
      }
    }
  }

  return meaningsString;
}

function getDiscordBotContent(kanjiInformation) {
  let content = {};

  let embedFields = [
    {name: 'Kunyomi', inline: true, value: kanjiInformation.kunyomi.join(', ')},
    {name: 'Onyomi', inline: true, value: kanjiInformation.onyomi.join(', ')},
    {name: 'Meaning', inline: true, value: getMeaningsString(kanjiInformation.meanings)},
    {name: 'Stroke Count', inline: true, value: kanjiInformation.strokeCount}
  ];

  let examplesStr = '';
  for (let i = 0; i < kanjiInformation.examples.length && i < MAXIMUM_EXAMPLE_COUNT; ++i) {
    examplesStr += kanjiInformation.examples[i].toDiscordBotString(MAXIMUM_EXAMPLE_LENGTH_IN_CHARS) + '\n';
  }

  let thumbnailInfo = {width: 124, height: 124};
  if (kanjiInformation.strokeAnimationBuffer) {
    thumbnailInfo.url = 'attachment://upload.png';
  }

  if (examplesStr) {
    embedFields.push({name: 'Examples', inline: true, value: examplesStr});
  }

  content.embed = {
    'title': 'Information about the Kanji: ' + kanjiInformation.kanji,
    'url': 'http://jisho.org/search/' + encodeURIComponent(kanjiInformation.kanji) + '%23kanji',
    'fields': embedFields,
    'thumbnail': thumbnailInfo,
    'color': constants.EMBED_NEUTRAL_COLOR,
    'footer': {
      'text': 'Wanna see detailed stroke information for this Kanji? Try k!so ' + kanjiInformation.kanji,
      'icon_url': constants.FOOTER_ICON_URI,
    }
  };

  return content;
}

function getFileUploadInformation(kanjiInformation) {
  if (kanjiInformation.strokeAnimationBuffer) {
    return {file: kanjiInformation.strokeAnimationBuffer, name: 'upload.png'};
  }
}

function tryLookup(bot, msg, kanji) {
  return jishoScreenScraper.searchKanji(kanji).then(result => {
    if (result) {
      let content = getDiscordBotContent(result);
      let fileInfo = getFileUploadInformation(result);
      return msg.channel.createMessage(content, fileInfo);
    } else {
      msg.channel.createMessage('Sorry, didn\'t find any results for the Kanji: **' + kanji + '**');
    }
  });
}

module.exports = function(suffix, bot, msg) {
  if (suffix) {
    let kanji = suffix[0];
    return tryLookup(bot, msg, kanji);
  }
  return msg.channel.createMessage('Say \'k!kanji [kanji]\' to search for information about a Kanji.');
};
