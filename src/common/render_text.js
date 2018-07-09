'use strict'
const reload = require('require-reload')(require);
const Canvas = require('canvas');
const fs = require('fs');
const renderFurigana = require('render-furigana');

const TOP_PADDING_IN_PIXELS = 6;
const BOTTOM_PADDING_IN_PIXELS = 6;
const LEFT_PADDING_IN_PIXELS = 6;
const RIGHT_PADDING_IN_PIXELS = 6;
const TOTAL_VERTICAL_PADDING_IN_PIXELS = TOP_PADDING_IN_PIXELS + BOTTOM_PADDING_IN_PIXELS;
const TOTAL_HORIZONTAL_PADDING_IN_PIXELS = LEFT_PADDING_IN_PIXELS + RIGHT_PADDING_IN_PIXELS;

module.exports.render = function(text, textColor, backgroundColor) {
  textColor = textColor || 'black';
  backgroundColor = backgroundColor || 'white';
  return new Promise((fulfill, reject) => {
    let canvas = new Canvas(0, 0);
    let ctx = canvas.getContext('2d');
    ctx.font = '106px IPAMincho';

    let measurements = ctx.measureText(text);
    canvas.width = measurements.width + TOTAL_HORIZONTAL_PADDING_IN_PIXELS;
    canvas.height = measurements.actualBoundingBoxAscent + measurements.actualBoundingBoxDescent + TOTAL_VERTICAL_PADDING_IN_PIXELS;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = textColor;
    ctx.fillText(text, LEFT_PADDING_IN_PIXELS, measurements.actualBoundingBoxAscent + TOP_PADDING_IN_PIXELS);

    canvas.toBuffer(function(err, buffer) {
      if (err) {
        reject(err);
      } else {
        fulfill(buffer);
      }
    }, 9, canvas.PNG_FILTER_NONE);
  });
};

module.exports.renderJapaneseWithFurigana = function(text, mainFontSize, fontColor) {
  const mainFontSizeDivisibleBy2 = Math.floor(mainFontSize / 2) * 2;
  const furiganaFontSize = mainFontSizeDivisibleBy2 / 2;
  const kanjiFont = `${mainFontSizeDivisibleBy2}px IPAMincho`;
  const furiganaFont = `${furiganaFontSize}px IPAMincho`;

  // This is pretty arbitrary but works well.
  const maxWidthInPixels = Math.ceil(Math.floor((mainFontSizeDivisibleBy2 / 40) * 600), 600);

  let options = {
    maxWidthInPixels,
    backgroundColor: 'rgba(54, 57, 62, 1)',
    textColor: fontColor,
  };

  console.time('render furigana time');
  return renderFurigana(text, kanjiFont, furiganaFont, options).then(data => {
    console.timeEnd('render furigana time');
    return data;
  });
}
