const path = require('path');
const renderFurigana = require('render-furigana');
const { initializeFonts, initializeResourceDatabase } = require('kotoba-node-common');
const Canvas = require('canvas');
const Config = require('./../../config/config.js');
const fetch = require('node-fetch');

const FONT_PATH = path.join(__dirname, '..', '..', 'resources', 'fonts');
const RESOURCES_DATABASE_PATH = path.join(__dirname, '..', 'generated', 'resources.dat');

const resourceDatabase = initializeResourceDatabase(RESOURCES_DATABASE_PATH);
const fontHelper = initializeFonts(FONT_PATH, resourceDatabase, Canvas);

async function getFurigana(text) {
  const fetchResult = await fetch(`${Config.worker.furiganaApiUri}`, {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

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

  const { fontFamily } = fontHelper.getFontForAlias(fontSetting);
  const mainFontSizeDivisibleBy2 = Math.floor(mainFontSize / 2) * 2;
  const furiganaFontSize = mainFontSizeDivisibleBy2 / 2;
  const kanjiFont = `${mainFontSizeDivisibleBy2}px ${fontFamily}`;
  const furiganaFont = `${furiganaFontSize}px ${fontFamily}`;

  let maxWidthInPixels;
  if (text.length <= 50) {
    maxWidthInPixels = 400;
  } else {
    maxWidthInPixels = Math.min(525 * Math.floor(text.length / 50), 1575);
  }

  const options = {
    maxWidthInPixels,
    backgroundColor,
    textColor,
  };

  return renderFurigana(furigana, kanjiFont, furiganaFont, options);
}

module.exports = render;
