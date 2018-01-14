'use strict'
const reload = require('require-reload')(require);
const Canvas = require('canvas');
const fs = require('fs');
const renderFurigana = require('render-furigana');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');

const TOP_PADDING_IN_PIXELS = 6;
const BOTTOM_PADDING_IN_PIXELS = 6;
const LEFT_PADDING_IN_PIXELS = 6;
const RIGHT_PADDING_IN_PIXELS = 6;
const TOTAL_VERTICAL_PADDING_IN_PIXELS = TOP_PADDING_IN_PIXELS + BOTTOM_PADDING_IN_PIXELS;
const TOTAL_HORIZONTAL_PADDING_IN_PIXELS = LEFT_PADDING_IN_PIXELS + RIGHT_PADDING_IN_PIXELS;

const minifier = imageminPngquant({
  quality: '0-25',
  floyd: 0,
  nofs: true,
  speed: 0,
});

module.exports.render = function(text) {
  return new Promise((fulfill, reject) => {
    let canvas = new Canvas(0, 0);
    let ctx = canvas.getContext('2d');
    ctx.font = '120px IPAMincho';

    let measurements = ctx.measureText(text);
    canvas.width = measurements.width + TOTAL_HORIZONTAL_PADDING_IN_PIXELS;
    canvas.height = measurements.actualBoundingBoxAscent + measurements.actualBoundingBoxDescent + TOTAL_VERTICAL_PADDING_IN_PIXELS;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'black';
    ctx.fillText(text, LEFT_PADDING_IN_PIXELS, measurements.actualBoundingBoxAscent + TOP_PADDING_IN_PIXELS);

    canvas.toBuffer(function(err, buffer) {
      if (err) {
        reject(err);
      } else {
        let minifyPromise = imagemin.buffer(buffer, {
          plugins: [minifier],
        }).then(buffer => {
          return buffer;
        });

        fulfill(minifyPromise);
      }
    }, 0, canvas.PNG_FILTER_NONE);
  });
};

module.exports.renderJapaneseWithFurigana = function(text) {
  const kanjiFont = '40px IPAMincho';
  const furiganaFont = '20px IPAMincho';

  let options = {
    maxWidthInPixels: 600,
    backgroundColor: 'rgba(54, 57, 62, 1)',
    textColor: 'rgba(192, 193, 194, 1)',
  };

  console.time('render furigana time');
  return renderFurigana(text, kanjiFont, furiganaFont, options).then(data => {
    console.timeEnd('render furigana time');
    return data;
  });
}
