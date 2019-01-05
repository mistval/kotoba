const RANDOM_FONT_SETTING = 'Random';

// List the real fonts here (as opposed to the meta fonts [as of now only 'Random'])
const descriptionForFontSetting = {
  'Yu Mincho': 'An elegant font',
  'Noto Sans CJK JP': 'A commonly used web font',
  Meiryo: 'A commonly used print font',
  SetoFont: 'A cute handwritten font',
  PopRumCute: 'Another cute handwritten font',
  KaiTi: 'A Chinese font',
  AoyagiKouzanFontT: 'A caligraphy brush font (kinda challenging)',
  CP_Revenge: 'A cyberpunk font',
  Genkaimincho: 'An apocalyptic font (recommend using a dark background color and light font color)',
  'kurobara-cinderella': 'A mAaAaAaAagical font',
};

const realFontNames = Object.keys(descriptionForFontSetting);

// Add in the meta fonts
descriptionForFontSetting[RANDOM_FONT_SETTING] = 'Cycle through fonts randomly';

function getRandomFont() {
  const randomIndex = Math.floor(Math.random() * realFontNames.length);
  return realFontNames[randomIndex];
}

function getFontNameForFontSetting(fontSetting = realFontNames[0]) {
  if (fontSetting === RANDOM_FONT_SETTING) {
    return getRandomFont();
  }
  if (realFontNames.indexOf(fontSetting) === -1) {
    return realFontNames[0];
  }

  return fontSetting;
}

module.exports = {
  availableFontSettings: Object.keys(descriptionForFontSetting),
  descriptionForFontSetting,
  getFontNameForFontSetting,
};
