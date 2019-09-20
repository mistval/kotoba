const Canvas = require('canvas');
const path = require('path');

const TOP_PADDING_IN_PIXELS = 6;
const BOTTOM_PADDING_IN_PIXELS = 6;
const BASE_LEFT_PADDING_IN_PIXELS = 6;
const BASE_RIGHT_PADDING_IN_PIXELS = 6;
const TOTAL_VERTICAL_PADDING_IN_PIXELS = TOP_PADDING_IN_PIXELS + BOTTOM_PADDING_IN_PIXELS;

const FONT_ALIAS = 'noto';
const FONT_PATH = path.join(__dirname, '..', '..', 'resources', 'fonts', 'opentype', 'noto-sans', 'NotoSansCJKjp-Regular.otf');

Canvas.registerFont(FONT_PATH, { family: FONT_ALIAS });

function render(text, textColor = 'black', backgroundColor = 'white', fontSize = 96) {
  const canvas = Canvas.createCanvas(0, 0);
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${FONT_ALIAS}`;

  const measurements = ctx.measureText(text);

  const leftPaddingInPixels = BASE_LEFT_PADDING_IN_PIXELS * Math.floor((text.length / 4) + 1);
  const rightPaddingInPixels = BASE_RIGHT_PADDING_IN_PIXELS * Math.floor((text.length / 4) + 1);
  const totalHorizontalPaddingInPixels = leftPaddingInPixels + rightPaddingInPixels;

  canvas.width = measurements.width + totalHorizontalPaddingInPixels;
  canvas.height = measurements.actualBoundingBoxAscent +
    measurements.actualBoundingBoxDescent +
    TOTAL_VERTICAL_PADDING_IN_PIXELS;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px ${FONT_ALIAS}`;
  ctx.fillText(
    text,
    leftPaddingInPixels,
    measurements.actualBoundingBoxAscent + TOP_PADDING_IN_PIXELS,
  );

  const bufferOptions = { compressionLevel: 9, filters: canvas.PNG_FILTER_NONE };
  const buffer = canvas.toBuffer('image/png', bufferOptions);
  return buffer;
}

module.exports = {
  render,
};
