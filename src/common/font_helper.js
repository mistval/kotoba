const assert = require('assert');

const RANDOM_FONT_SETTING = 'Random';

// List the real fonts here (as opposed to the meta fonts [as of now only 'Random'])
const descriptionForFontSetting = {
  'Yu Mincho': 'An elegant font',
  'Noto Sans CJK JP': 'A commonly used web font',
  'Meiryo': 'A commonly used print font',
  'SetoFont': 'A cute handwritten font',
  'KaiTi': 'A Chinese font',
  'AoyagiKouzanFontT': 'A caligraphy brush font (kinda challenging)',
};

const realFontNames = Object.keys(descriptionForFontSetting);

// Add in the meta fonts
descriptionForFontSetting[RANDOM_FONT_SETTING] = 'Cycle through fonts randomly';

function getRandomFont() {
  const randomIndex = Math.floor(Math.random() * realFontNames.length);
  return realFontNames[randomIndex];
}

function getFontNameForFontSetting(fontSetting) {
  fontSetting = fontSetting || realFontNames[0];
  if (fontSetting === RANDOM_FONT_SETTING) {
    return getRandomFont();
  }

  assert(realFontNames.indexOf(fontSetting) !== -1, 'Requested font setting is unknown');
  return fontSetting;
}

module.exports = {
  availableFontSettings: Object.keys(descriptionForFontSetting),
  descriptionForFontSetting,
  getFontNameForFontSetting,
};
