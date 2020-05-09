const path = require('path');
const renderFurigana = require('render-furigana');
const { initializeFonts } = require('kotoba-node-common');
const Canvas = require('canvas');
const Config = require('./../../config/config.js');
const fetch = require('node-fetch');

const FONT_PATH = path.join(__dirname, '..', '..', 'resources', 'fonts');
const CHARACTER_MAP_PATH = path.join(__dirname, '..', 'generated', 'font_character_map.json');

const fontHelper = initializeFonts(FONT_PATH, CHARACTER_MAP_PATH, Canvas);

async function getFurigana(text) {
  const fetchResult = await fetch(`${Config.worker.furiganaApiUri}?text=${encodeURIComponent(text)}`);
  if (!fetchResult.ok) {
    throw new Error(`Unexpected response from furigana API: ${fetchResult.status}`);
  }

  const furigana = await fetchResult.json();
  return furigana.map(f => ({
    kanji: f.text,
    furigana: f.reading,
  }));
}

async function render(text, mainFontSize, textColor, backgroundColor, fontSetting) {
  const furigana = await getFurigana(text);

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

  return renderFurigana(furigana, kanjiFont, furiganaFont, options);
}

module.exports = render;
