

const Canvas = require('canvas');
const renderFurigana = require('render-furigana');
const { fontHelper } = require('./../common/globals.js');

const TOP_PADDING_IN_PIXELS = 6;
const BOTTOM_PADDING_IN_PIXELS = 6;
const BASE_LEFT_PADDING_IN_PIXELS = 6;
const BASE_RIGHT_PADDING_IN_PIXELS = 6;
const TOTAL_VERTICAL_PADDING_IN_PIXELS = TOP_PADDING_IN_PIXELS + BOTTOM_PADDING_IN_PIXELS;

function render(text, textColor = 'black', backgroundColor = 'white', fontSize = 96, fontSetting = 'Yu Mincho', allowFontFallback = true) {
  const fontFamily = fontHelper.getFontForAlias(fontSetting).fontFamily;
  const coercedFont = allowFontFallback
    ? fontHelper.coerceFontFamily(fontFamily, text)
    : fontFamily;

  const canvas = Canvas.createCanvas(0, 0);
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${coercedFont}`;

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
  ctx.font = `${fontSize}px ${coercedFont}`;
  ctx.fillText(
    text,
    leftPaddingInPixels,
    measurements.actualBoundingBoxAscent + TOP_PADDING_IN_PIXELS,
  );

  return new Promise((fulfill, reject) => {
    const bufferOptions = { compressionLevel: 5, filters: canvas.PNG_FILTER_NONE };
    canvas.toBuffer((err, buffer) => {
      if (err) {
        return reject(err);
      }
      return fulfill(buffer);
    }, 'image/png', bufferOptions);
  });
}

function renderJapaneseWithFurigana(text, mainFontSize, textColor, backgroundColor, fontSetting) {
  const fontFamily = fontHelper.getFontForAlias(fontSetting).fontFamily;
  const mainFontSizeDivisibleBy2 = Math.floor(mainFontSize / 2) * 2;
  const furiganaFontSize = mainFontSizeDivisibleBy2 / 2;
  const kanjiFont = `${mainFontSizeDivisibleBy2}px ${fontFamily}`;
  const furiganaFont = `${furiganaFontSize}px ${fontFamily}`;

  // This is pretty arbitrary but works well.
  const maxWidthInPixels = Math.ceil(Math.floor((mainFontSizeDivisibleBy2 / 40) * 600), 600);

  const options = {
    maxWidthInPixels,
    backgroundColor,
    textColor,
  };

  console.time('render furigana time');
  return renderFurigana(text, kanjiFont, furiganaFont, options).then((data) => {
    console.timeEnd('render furigana time');
    return data;
  });
}

module.exports = {
  render,
  renderJapaneseWithFurigana,
};
