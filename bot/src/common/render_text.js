const Canvas = require('canvas');
require('canvas-5-polyfill');
const { fontHelper } = require('./globals.js');

function render(
  text,
  textColor = 'black',
  backgroundColor = 'white',
  fontSize = 96,
  fontSetting = 'Meiryo',
  allowFontFallback = true,
  effect = 'none',
) {
  const TOP_PADDING_IN_PIXELS = effect == "antiocr" ? 30 : 6;
  const BOTTOM_PADDING_IN_PIXELS = effect == "antiocr" ? 30 : 6;
  const BASE_LEFT_PADDING_IN_PIXELS = effect == "antiocr" ? 30 : 6;
  const BASE_RIGHT_PADDING_IN_PIXELS = effect == "antiocr" ? 30 : 6;
  const TOTAL_VERTICAL_PADDING_IN_PIXELS = TOP_PADDING_IN_PIXELS + BOTTOM_PADDING_IN_PIXELS;

  const { fontFamily } = fontHelper.getFontForAlias(fontSetting);
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
  canvas.height = measurements.actualBoundingBoxAscent
    + measurements.actualBoundingBoxDescent
    + TOTAL_VERTICAL_PADDING_IN_PIXELS;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);


  if (effect == "antiocr") {
    ctx.fillStyle = "#333333"
    ctx.font = `bold 30px Arial`;
    ctx.shadowColor = "black";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;
    const ocrFontHeight = 28;
    for (var h = 0; h < canvas.height + ocrFontHeight; h += ocrFontHeight) {
      ctx.fillText(
        "OCR ".repeat(50),
        0,
        h
      )
    }
    ctx.fillStyle = ctx.createLinearGradient(0, 0, canvas.width, 0);
    ctx.fillStyle.addColorStop(0, "red");
    ctx.fillStyle.addColorStop(0.5, "blue");
    ctx.fillStyle.addColorStop(1.0, "magenta");
    ctx.globalAlpha = 0.8;
  } else {
    ctx.fillStyle = textColor;
  }
  ctx.font = `${fontSize}px ${coercedFont}`;
  ctx.fillText(
    text,
    leftPaddingInPixels,
    measurements.actualBoundingBoxAscent + TOP_PADDING_IN_PIXELS,
  );
  if (effect == "antiocr") {
    ctx.strokeStyle = ctx.createLinearGradient(0, 0, canvas.width, 0);
    ctx.strokeStyle.addColorStop(0, "blue");
    ctx.strokeStyle.addColorStop(0.5, "orange");
    ctx.strokeStyle.addColorStop(1.0, "gray");
    ctx.lineWidth = 2;
    ctx.strokeText(
      text,
      leftPaddingInPixels,
      measurements.actualBoundingBoxAscent + TOP_PADDING_IN_PIXELS,
    );
  }


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

function renderStrokes(paths, highlightPathIndex, textColor = 'black', backgroundColor = 'white') {
  const canvas = Canvas.createCanvas(109, 109);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const preHighlightPaths = paths.slice(0, highlightPathIndex);
  const highlightPath = paths[highlightPathIndex];
  const postHighlightPaths = paths.slice(highlightPathIndex + 1);

  ctx.fillStyle = 'none';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = textColor;
  ctx.stroke(new global.Path2D(preHighlightPaths.join(' ')));

  ctx.strokeStyle = 'red';
  ctx.stroke(new global.Path2D(highlightPath));

  ctx.strokeStyle = textColor;
  ctx.stroke(new global.Path2D(postHighlightPaths.join(' ')));

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

module.exports = {
  render,
  renderStrokes,
};
