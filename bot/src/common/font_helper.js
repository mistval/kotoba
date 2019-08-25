const glob = require('glob');
const path = require('path');
const FontKit = require('fontkit');
let supportedCharactersForFont;

const SUPPORTED_CHARACTERS_MAP_DIR_PATH = path.join(__dirname, '..', '..', 'generated');
const SUPPORTED_CHARACTERS_MAP_PATH = path.join(SUPPORTED_CHARACTERS_MAP_DIR_PATH, 'supported_chars_for_font.json');
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

try {
  supportedCharactersForFont = require(SUPPORTED_CHARACTERS_MAP_PATH);
} catch (err) {
  // Might not exist, might not be needed. If it's needed, will error.
}

function buildSupportedCharactersForFontMap() {
  const supportedCharactersForFont = {};
  installedFonts.forEach((fontInfo) => {
    const fontKitFont = FontKit.openSync(fontInfo.filePath);
    const fontKitFonts = fontKitFont.fonts || [fontKitFont];
    supportedCharactersForFont[fontInfo.fontFamily] = {};

    // font.characterSet contains code points that the font doesn't actually support.
    // Not 100% sure how fonts work in this respect, but this is the only reliable
    // way I could find to figure out which fonts are actually supported.
    fontKitFonts.forEach((font) => {
      font.characterSet.forEach((char) => {
        const glyph = font.glyphForCodePoint(char);
        try {
          const fontSupportsCharacter = Number.isFinite(glyph.path.bbox.height);
          if (fontSupportsCharacter) {
            supportedCharactersForFont[fontInfo.fontFamily][String.fromCodePoint(char)] = true;
          }
        } catch (err) {
        }
      });
    });
  });

  return supportedCharactersForFont;
}

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

function fontSupportsCharacter(font, char) {
  if (!supportedCharactersForFont) {
    throw new Error('No supported character map found. Please run: npm run buildfontcharactermap');
  }
  return supportedCharactersForFont[font] && supportedCharactersForFont[font][char];
}

function fontSupportsString(font, str) {
  return str.split('').every(c => fontSupportsCharacter(font, c));
}

function coerceFontForString(font, str) {
  if (fontSupportsString(font, str)) {
    return font;
  }

  const supportedFontInfo = installedFonts.find(f => fontSupportsString(f.fontFamily, str));
  if (supportedFontInfo) {
    return supportedFontInfo;
  }

  return installedFonts[0];
}

module.exports = {
  installedFonts,
  allFonts,
  getFontNameForFontSetting,
  coerceFontForString,
  buildSupportedCharactersForFontMap,
  SUPPORTED_CHARACTERS_MAP_DIR_PATH,
  SUPPORTED_CHARACTERS_MAP_PATH,
};
