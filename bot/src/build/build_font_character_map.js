const FontHelper = require('../common/font_helper.js');
const fs = require('fs');

console.log('Building supported character map');

const characterMap = FontHelper.buildSupportedCharactersForFontMap();
fs.mkdirSync(FontHelper.SUPPORTED_CHARACTERS_MAP_DIR_PATH, { recursive: true });
fs.writeFileSync(FontHelper.SUPPORTED_CHARACTERS_MAP_PATH, JSON.stringify(characterMap));

console.log('Done');
