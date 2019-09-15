const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'img', 'stroke_order_images');
const availableFilesArr = fs.readdirSync(dir);
const availableFilesDictionary = {};

availableFilesArr.forEach((fileName) => {
  availableFilesDictionary[fileName] = true;
});

const outPath = path.join(__dirname, '..', 'strokeorder', 'available_kanji_files.json');
fs.writeFileSync(outPath, JSON.stringify(availableFilesDictionary, undefined, 2));
