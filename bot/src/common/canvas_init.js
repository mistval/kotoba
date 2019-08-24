const Canvas = require('canvas');
const FontHelper = require('./font_helper.js');

function init() {
  FontHelper.installedFonts.forEach((installedFont) => {
    try {
      Canvas.registerFont(installedFont.filePath, { family: installedFont.fontFamily });
    } catch (err) {
      throw new Error(`Failed to load font: ${installedFont.fontFamily} from ${installedFont.filePath}.`);
    }
  });
}

module.exports = init;
