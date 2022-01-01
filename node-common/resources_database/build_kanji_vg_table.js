const assert = require('assert');
const fs = require('fs');
const zlib = require('zlib');
const xmlToJs = require('xml2js');

function decompressAndParseXml(filePath) {
  const compressedBytes = fs.readFileSync(filePath);
  const decompressedBytes = zlib.gunzipSync(compressedBytes);
  const decompressedString = decompressedBytes.toString('utf8');
  let result;
  
  xmlToJs.parseString(decompressedString, (err, res) => {
    if (err) {
      throw err;
    }

    result = res;
  });

  return result;
}

function findPaths(obj, paths) {
  const top = !Boolean(paths);

  if (top) {
    paths = [];
  }

  if (Array.isArray(obj)) {
    obj.forEach(o => findPaths(o, paths));
  } else {
    const kvps = Object.entries(obj);
    kvps.forEach(([key, value]) => {
      if (key === 'path') {
        paths.push(...value.map(p => ({ d: p.$.d, id: p.$.id })));
      } else if (typeof value === 'object') {
        findPaths(value, paths);
      }
    });
  }

  if (top) {
    return paths.sort((a, b) => {
      const aStrokeNumber = Number(a.id.split('-s')[1]);
      const bStrokeNumber = Number(b.id.split('-s')[1]);

      return aStrokeNumber - bStrokeNumber;
    }).map(e => e.d);
  }
}

module.exports = function buildKanjiVgTable(database, kanjiVgPath) {
  const kanjiVgData = decompressAndParseXml(kanjiVgPath);

  database.exec('CREATE TABLE StrokeData (kanji CHAR(1) PRIMARY KEY, strokeDataJson TEXT);');
  const insertStatement = database.prepare('INSERT INTO StrokeData VALUES (?, ?);');

  const insertTransaction = database.transaction(() => {
    kanjiVgData.kanjivg.kanji.forEach((entry) => {
      const id = entry.$.id;
      const [type, codePointHex] = id.split('_');
      assert(type === 'kvg:kanji', `Unknown entry type: ${type}`);
      assert(codePointHex, 'No code point');

      const codePoint = Number(`0x${codePointHex}`);
      const character = String.fromCodePoint(codePoint);

      const paths = findPaths(entry);

      const data = { paths };
      insertStatement.run(character, JSON.stringify(data));
    });
  });

  insertTransaction();
}
