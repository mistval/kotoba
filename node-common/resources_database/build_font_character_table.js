const path = require('path');
const glob = require('glob');
const FontKit = require('fontkit');

module.exports = function buildFontCharacterTable(database, fontsDirPath) {
  const fontFilePaths = glob.sync(`${fontsDirPath}/**/*.{otf,ttf,ttc}`);
  const insertRows = [];

  const baseNames = fontFilePaths.map(p => path.basename(p));
  const duplicateBaseName = baseNames.find((b, i) => baseNames.indexOf(b) !== i);
  if (duplicateBaseName) {
    throw new Error(`There is more than one font file named ${duplicateBaseName}. There should be just one.`);
  }

  for (const fontFilePath of fontFilePaths) {
    const fileName = path.basename(fontFilePath);
    const fontKitRootFont = FontKit.openSync(fontFilePath);
    const fontKitFonts = fontKitRootFont.fonts || [fontKitRootFont];

    for (const fontKitFont of fontKitFonts) {
      for (const codePoint of fontKitFont.characterSet) {
        const glyph = fontKitFont.glyphForCodePoint(codePoint);
        try {
          const space = 32;
          if (Number.isFinite(glyph.path.cbox.height) || glyph.layers || char === space) {
            const str = String.fromCodePoint(codePoint);
            insertRows.push([fileName, str]);
          }
        } catch (err) {
          // NOOP. Some of the properties on glyph are getters that error
          // if the glyph isn't supported. Catch those errors and skip the glyph.
        }
      }
    }
  }

  database.exec('CREATE TABLE FontCharacters (fontFileName VARCHAR(100), character CHAR(1));');
  database.exec('CREATE UNIQUE INDEX fontCharactersIndex ON FontCharacters (fontFileName, character);');
  const insertStatement = database.prepare('INSERT INTO FontCharacters VALUES (?, ?) ON CONFLICT DO NOTHING;');

  const transaction = database.transaction(() => {
    for (const row of insertRows) {
      insertStatement.run(...row);
    }
  });

  transaction();
}