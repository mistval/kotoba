const Canvas = require('canvas');

function init(fontHelper) {
  fontHelper.fonts.forEach((font) => {
    font.filePaths.forEach((filePath) => {
      try {
        Canvas.registerFont(filePath, { family: font.fontFamily });
      } catch (err) {
        throw new Error(`Failed to load font: ${font.fontFamily} from ${filePath}.`);
      }
    });
  });
}

module.exports = init;
