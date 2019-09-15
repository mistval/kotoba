'use strict'

const Canvas = require('canvas');

const TOP_PADDING_IN_PIXELS = 6;
const BOTTOM_PADDING_IN_PIXELS = 6;
const LEFT_PADDING_IN_PIXELS = 6;
const RIGHT_PADDING_IN_PIXELS = 6;
const TOTAL_VERTICAL_PADDING_IN_PIXELS = TOP_PADDING_IN_PIXELS + BOTTOM_PADDING_IN_PIXELS;
const TOTAL_HORIZONTAL_PADDING_IN_PIXELS = LEFT_PADDING_IN_PIXELS + RIGHT_PADDING_IN_PIXELS;

module.exports.render = function(text, textColor, backgroundColor, fontSize, fontSetting) {
  textColor = textColor || 'black';
  backgroundColor = backgroundColor || 'white';
  fontSize = fontSize || 106;
  fontSetting = fontSetting || 'Yu Mincho';
  return new Promise((fulfill, reject) => {
    let canvas = new Canvas(0, 0);
    let ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${fontSetting}`;

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
