const glob = require('glob');
const path = require('path');
const FontKit = require('fontkit');
const colorValidator = require('validate-color');

let supportedCharactersForFont;

const SUPPORTED_CHARACTERS_MAP_DIR_PATH = path.join(__dirname, '..', '..', 'generated');
const SUPPORTED_CHARACTERS_MAP_PATH = path.join(SUPPORTED_CHARACTERS_MAP_DIR_PATH, 'supported_chars_for_font.json');
const RANDOM_FONT_SETTING = 'Random';

const fontMetaFilePaths = glob.sync(`${__dirname}/../../../resources/fonts/**/meta.json`);
const installedFonts = [];

fontMetaFilePaths.forEach((metaPath) => {
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const meta = require(metaPath);
  const dir = path.dirname(metaPath);
  const fontFilePaths = glob.sync(`${dir}/*.{otf,ttf,ttc}`);
  installedFonts.push({
    filePaths: fontFilePaths,
    fontFamily: meta.fontFamily,
    order: meta.order,
    description: meta.description,
    hidden: !!meta.hidden,
  });
});

try {
  // eslint-disable-next-line global-require,import/no-dynamic-require
  supportedCharactersForFont = require(SUPPORTED_CHARACTERS_MAP_PATH);
} catch (err) {
  // Might not exist, might not be needed. If it's needed, will error.
}

function validateColor(color) {
  return colorValidator.validateHTMLColor(color)
    || colorValidator.validateHTMLColorHex(color)
    || colorValidator.validateHTMLColorName(color);
}

function buildSupportedCharactersForFontMap() {
  const supportedCharactersForFontInner = {};
  installedFonts.forEach((fontInfo) => {
    supportedCharactersForFontInner[fontInfo.fontFamily] = {};
    fontInfo.filePaths.forEach((filePath) => {
      const fontKitFont = FontKit.openSync(filePath);
      const fontKitFonts = fontKitFont.fonts || [fontKitFont];

      // font.characterSet contains code points that the font doesn't actually support.
      // Not 100% sure how fonts work in this respect, but this is the only reliable
      // way I could find to figure out which characters are actually supported.
      fontKitFonts.forEach((font) => {
        font.characterSet.forEach((char) => {
          const glyph = font.glyphForCodePoint(char);
          try {
            const space = 32;
            if (Number.isFinite(glyph.path.cbox.height) || glyph.layers || char === space) {
              supportedCharactersForFontInner[fontInfo.fontFamily][String.fromCodePoint(char)] = true;
            }
          } catch (err) {
            // NOOP. Some of the properties on glyph are getters that error
            // if the glyph isn't supported. Catch those errors and skip the glyph.
          }
        });
      });
    });
  });

  return supportedCharactersForFontInner;
}

installedFonts.sort((a, b) => a.order - b.order);

const listedInstalledFonts = installedFonts.filter(f => !f.hidden);

const allFonts = installedFonts.slice();
allFonts.push({
  fontFamily: RANDOM_FONT_SETTING,
  order: 1000,
  description: 'Cycle through fonts randomly',
});

const listedFonts = allFonts.filter(f => !f.hidden);

function getRandomFont() {
  const randomIndex = Math.floor(Math.random() * installedFonts.length);
  return installedFonts[randomIndex].fontFamily;
}

function getFontFamilyForFontSetting(fontSetting) {
  if (fontSetting === RANDOM_FONT_SETTING) {
    return getRandomFont();
  }

  const fontInfo = installedFonts.find(info => info.fontFamily === fontSetting);
  if (!fontInfo) {
    return installedFonts[0].fontFamily;
  }

  return fontInfo.fontFamily;
}

function fontFamilySupportsCharacter(fontFamily, char) {
  if (!supportedCharactersForFont) {
    throw new Error('No supported character map found. Please run: npm run buildfontcharactermap');
  }
  return supportedCharactersForFont[fontFamily] && supportedCharactersForFont[fontFamily][char];
}

function fontFamilySupportsChars(fontFamily, chars) {
  return chars.every(c => fontFamilySupportsCharacter(fontFamily, c));
}

function coerceFontFamilyForString(fontFamily, str) {
  const chars = Array.from(str);
  if (fontFamilySupportsChars(fontFamily, chars)) {
    return fontFamily;
  }

  const supportedFontInfo = installedFonts.find(f => fontFamilySupportsChars(f.fontFamily, chars));
  if (supportedFontInfo) {
    return supportedFontInfo.fontFamily;
  }

  return installedFonts[0].fontFamily;
}

function parseFontArgs(str) {
  const parseResult = {};

  parseResult.remainingString = str
    .replace(/,\s+/g, ',').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .replace(/font\s*=\s*([0-9]*)+/ig, (m, g1) => {
      const fontInt = parseInt(g1, 10);
      parseResult.fontFamily = (listedInstalledFonts[fontInt - 1] || {}).fontFamily;

      if (!parseResult.fontFamily) {
        parseResult.errorDescriptionShort = 'Invalid font';
        parseResult.errorDescriptionLong = `Please provide a number between 1 and ${listedInstalledFonts.length} as your font= setting.`;
      }

      return '';
    })
    .replace(/bgcolor\s*=\s*(\S*)/ig, (m, g1) => {
      parseResult.bgColor = g1.toLowerCase();

      if (!validateColor(parseResult.bgColor)) {
        parseResult.errorDescriptionShort = 'Invalid bgcolor';
        parseResult.errorDescriptionLong = 'Please enter a valid HTML color as your bgcolor= setting.';
      }

      return '';
    })
    .replace(/color\s*=\s*(\S*)/ig, (m, g1) => {
      parseResult.color = g1.toLowerCase();

      if (!validateColor(parseResult.color)) {
        parseResult.errorDescriptionShort = 'Invalid color';
        parseResult.errorDescriptionLong = 'Please enter a valid HTML color as your color= setting.';
      }

      return '';
    })
    .replace(/size\s*=\s*([0-9]*)+/ig, (m, g1) => {
      parseResult.size = parseInt(g1, 10);

      if (parseResult.size < 20 || parseResult.size > 200) {
        parseResult.errorDescriptionShort = 'Invalid size';
        parseResult.errorDescriptionLong = 'Please enter a number between 20 and 200 as your size= setting.';
      }

      return '';
    })
    .trim();

  return parseResult;
}

function fontSupportsString(fontFamily, string) {
  return fontFamilySupportsChars(fontFamily, Array.from(string));
}

module.exports = {
  installedFonts,
  listedFonts,
  listedInstalledFonts,
  getFontFamilyForFontSetting,
  coerceFontFamilyForString,
  buildSupportedCharactersForFontMap,
  SUPPORTED_CHARACTERS_MAP_DIR_PATH,
  SUPPORTED_CHARACTERS_MAP_PATH,
  parseFontArgs,
  fontSupportsString,
};
