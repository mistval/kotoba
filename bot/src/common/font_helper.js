const glob = require('glob');
const path = require('path');

const RANDOM_FONT_SETTING = 'Random';

const fontMetaFilePaths = glob.sync(`${__dirname}/../../fonts/**/meta.json`);
const installedFonts = [];

fontMetaFilePaths.forEach((metaPath) => {
  const meta = require(metaPath);
  const dir = path.dirname(metaPath);
  const fontFilePath = glob.sync(`${dir}/*.{otf,ttf,ttc}`)[0];
  installedFonts.push({
    filePath: fontFilePath,
    fontFamily: meta.fontFamily,
    order: meta.order,
    description: meta.description,
  });
});

installedFonts.sort((a, b) => a.order - b.order);

const allFonts = installedFonts.slice();
allFonts.push({
  fontFamily: RANDOM_FONT_SETTING,
  order: 1000,
  description: 'Cycle through fonts randomly',
});

function getRandomFont() {
  const randomIndex = Math.floor(Math.random() * installedFonts.length);
  return installedFonts[randomIndex].fontFamily;
}

function getFontNameForFontSetting(fontSetting = realFontNames[0]) {
  if (fontSetting === RANDOM_FONT_SETTING) {
    return getRandomFont();
  }

  const fontInfo = installedFonts.find(fontInfo => fontInfo.fontFamily === fontSetting);
  if (!fontInfo) {
    return installedFonts[0].fontFamily;
  }

  return fontInfo.fontFamily;
}

module.exports = {
  installedFonts,
  allFonts,
  getFontNameForFontSetting,
};
