const FontHelper = require('./font_helper.js');

function initializeFonts(fontPath, fontCharacterMapPath, canvas) {
  const fontHelper = new FontHelper();
  fontHelper.loadFontsSync(fontPath, fontCharacterMapPath);

  if (canvas) {
    fontHelper.registerFonts(canvas);
  }

  return fontHelper;
}

if (require.main === module) {
  initializeFonts(process.argv[2], process.argv[3]);
}

module.exports = initializeFonts;
