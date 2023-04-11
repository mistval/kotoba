const Canvas = require('canvas');

function render(
  text,
  textColor = 'black',
  backgroundColor = 'white',
  fontSize = 96,
  coercedFont = 'DejaVu Sans',
  effect = 'none',
) {
  const topPaddingInPixels = effect === 'antiocr' ? 30 : 6;
  const bottomPaddingInPixels = effect === 'antiocr' ? 30 : 6;
  const baseLeftPaddingInPixels = effect === 'antiocr' ? 30 : 6;
  const baseRightPaddingInPixels = effect === 'antiocr' ? 30 : 6;
  const totalVerticalPaddingInPixels = topPaddingInPixels + bottomPaddingInPixels;

  const canvas = Canvas.createCanvas(0, 0);
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${coercedFont}`;

  const measurements = ctx.measureText(text);

  const leftPaddingInPixels = baseLeftPaddingInPixels * Math.floor((text.length / 4) + 1);
  const rightPaddingInPixels = baseRightPaddingInPixels * Math.floor((text.length / 4) + 1);
  const totalHorizontalPaddingInPixels = leftPaddingInPixels + rightPaddingInPixels;

  canvas.width = measurements.width + totalHorizontalPaddingInPixels;
  canvas.height = measurements.actualBoundingBoxAscent
    + measurements.actualBoundingBoxDescent
    + totalVerticalPaddingInPixels;

  ctx.fillStyle = effect === 'antiocr' ? 'black' : backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (effect === 'antiocr') {
    ctx.fillStyle = '#555555';
    ctx.font = 'bold 30px DejaVu Sans';
    ctx.shadowColor = '#333333';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;
    const ocrFontHeight = 28;
    for (let h = 0; h < canvas.height + ocrFontHeight; h += ocrFontHeight) {
      ctx.fillText(
        'OCR '.repeat(50),
        0,
        h,
      );
    }
    ctx.fillStyle = ctx.createLinearGradient(0, 0, canvas.width, 0);
    ctx.fillStyle.addColorStop(0, 'red');
    ctx.fillStyle.addColorStop(0.5, 'blue');
    ctx.fillStyle.addColorStop(1.0, 'magenta');
    ctx.globalAlpha = 0.8;
  } else {
    ctx.fillStyle = textColor;
  }
  ctx.font = `${fontSize}px ${coercedFont}`;
  ctx.fillText(
    text,
    leftPaddingInPixels,
    measurements.actualBoundingBoxAscent + topPaddingInPixels,
  );
  if (effect === 'antiocr') {
    ctx.strokeStyle = ctx.createLinearGradient(0, 0, canvas.width, 0);
    ctx.strokeStyle.addColorStop(0, 'blue');
    ctx.strokeStyle.addColorStop(0.5, 'orange');
    ctx.strokeStyle.addColorStop(1.0, 'gray');
    ctx.lineWidth = 2;
    ctx.strokeText(
      text,
      leftPaddingInPixels,
      measurements.actualBoundingBoxAscent + topPaddingInPixels,
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

module.exports = {
  render,
};
