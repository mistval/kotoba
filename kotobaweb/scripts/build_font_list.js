const glob = require('glob');
const fs = require('fs');
const path = require('path');

const baseFontDirPath = path.join(__dirname, '..', '..', 'resources', 'fonts');
const fontMetaPaths = glob.sync(path.join(baseFontDirPath, '**', '*.json'));
const fontList = fontMetaPaths
  .map(p => JSON.parse(fs.readFileSync(p)))
  .filter(meta => !meta.hidden)
  .sort((a, b) => a.order - b.order)
  .map(meta => [meta.fontFamily, ...meta.cssFontNames]);

const fontListPath = path.join(__dirname, '..', 'src', 'bot', 'quiz_builder_components', 'font_list.json');
fs.writeFileSync(fontListPath, JSON.stringify(fontList));
