const FontHelper = require('./font_helper.js');

function initializeFonts(fontPath, resourceDatabase, canvas) {
  const fontHelper = new FontHelper(resourceDatabase);
  fontHelper.loadFontsSync(fontPath);

  if (canvas) {
    fontHelper.registerFonts(canvas);
  }

  return fontHelper;
}

module.exports = initializeFonts;
