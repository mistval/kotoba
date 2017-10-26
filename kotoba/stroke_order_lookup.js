'use strict'
const reload = require('require-reload')(require);
const KotobaUtils = reload('./utils.js');
const htmlparser = require('htmlparser');
const fs = require('fs');
const request = require('request-promise');
const constants = require('./constants.js');

function createResponse(bot, msg, jishoData, kanji) {
  const fileCodeStringLength = 5;
  let unicodeString = kanji.codePointAt(0).toString(16);
  let fillZeroes = fileCodeStringLength - unicodeString.length;
  let fileCode = new Array(fillZeroes + 1).join('0') + unicodeString;
  let fileName = fileCode + '_anim.gif';

  return new Promise((fulfill, reject) => {
    fs.readFile(__dirname + '/resources/images/kanjianimations/' + fileName, (err, fileData) => {
      try {
        let foundStrokeDiagram = !err;
        let foundJishoResult = jishoData && jishoData.indexOf('Couldn\'t find any info for the characters supplied') === -1;
        if (foundJishoResult) {
          let info = {};
          let strokeCountStartString = '<div class="specs"><strong>';
          let startIndex = jishoData.indexOf(strokeCountStartString) + strokeCountStartString.length;

          if (startIndex !== -1 + strokeCountStartString.length) {
            let endIndex = jishoData.indexOf('</strong>', startIndex);
            info.strokeCount = jishoData.substring(startIndex, endIndex);
          }

          let radicalStartString = '<strong>Radical: </strong> ';
          startIndex = jishoData.indexOf(radicalStartString) + radicalStartString.length;

          if (startIndex !== -1 + radicalStartString.length) {
            let endIndex = startIndex + 1;
            info.radical = jishoData.substring(startIndex, endIndex);
          }

          let partsStartString = '<strong>Parts:</strong>';
          startIndex = jishoData.indexOf(partsStartString) + partsStartString.length;

          if (startIndex !== -1 + partsStartString.length) {
            let endIndex = jishoData.indexOf('<br />', startIndex);
            let block = jishoData.substring(startIndex, endIndex);

            let parseHandler = new htmlparser.DefaultHandler(function(error, dom) {});
            let parser = new htmlparser.Parser(parseHandler);
            parser.parseComplete(block);
            let dom = parseHandler.dom;
            let parts = '';

            for (let element of dom) {
              if (element.children) {
                parts += element.children[0].raw + ', ';
              }
            }

            parts = parts.substring(0, parts.length - 2);
            info.parts = parts;
          }

          let strokeDiagramUrlStartString = '/static/images/stroke_diagrams/';
          startIndex = jishoData.indexOf(strokeDiagramUrlStartString);

          if (startIndex !== -1) {
            let endIndex = jishoData.indexOf('" />', startIndex);
            info.diagramUrl = 'http://classic.jisho.org' + jishoData.substring(startIndex, endIndex);
          }

          let content = {};

          let embedFields = [];
          if (info.radical) {
            embedFields.push({name: 'Radical', inline: true, value: info.radical});
          }
          if (info.parts) {
            embedFields.push({name: 'Parts', inline: true, value: info.parts});
          }
          if (info.strokeCount) {
            embedFields.push({name: 'Stroke Count', inline: true, value: info.strokeCount});
          }

          let thumbnailInfo;
          let attachmentData;
          let attachmentObject;
          if (fileData) {
            thumbnailInfo = {width: 150, height: 150};
            thumbnailInfo.url = 'attachment://upload.gif';
            attachmentData = fileData;
            attachmentObject = {file: attachmentData, name: 'upload.gif'};
          }

          content.embed = {
            title: 'Information about the Kanji: ' + kanji,
            url: 'http://jisho.org/search/' + kanji + '%23kanji',
            fields: embedFields,
            color: constants.EMBED_NEUTRAL_COLOR,
          };

          if (thumbnailInfo) {
            content.embed.thumbnail = thumbnailInfo;
          }

          if (info.diagramUrl) {
            content.embed.image = {url: info.diagramUrl, width: 100, height: 100};
          }

          fulfill(msg.channel.createMessage(content, attachmentObject));
        } else if (foundStrokeDiagram) {
          fulfill(msg.channel.createMessage('', {file: fileData, name: 'upload.gif'}));
        } else {
          fulfill(msg.channel.createMessage('Sorry, didn\'t find any results for the Kanji: **' + kanji + '**'));
        }
      } catch (e) {
        reject(e);
      }
    });
  });
}

function tryLookup(bot, msg, kanji) {
  let jishoUri = 'http://classic.jisho.org/kanji/details/' + encodeURIComponent(kanji);
  return request({uri: jishoUri, json: false, timeout: 10000}).then(data => {
    return createResponse(bot, msg, data, kanji);
  }).catch(err => {
    return createResponse(bot, msg, undefined, kanji);
  });
};

module.exports = function(suffix, bot, msg) {
  if (suffix === '') {
    return msg.channel.createMessage('Say \'k!so [kanji]\' to search for stroke information about a Kanji.');
  } else {
    let kanji = suffix[0];
    return tryLookup(bot, msg, kanji);
  }
};
