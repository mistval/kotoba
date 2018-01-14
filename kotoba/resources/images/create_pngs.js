const kanjiRenderer = require('./../../render_text.js');
const fs = require('fs');

let animationFileNames = fs.readdirSync('./kanjianimations');

let promises = [];
for (let fileName of animationFileNames) {
  let kanjiUnicode = parseInt('0x' + fileName.replace('_anim.gif', ''));
  let kanji = String.fromCharCode(kanjiUnicode);
  let promise = kanjiRenderer.render(kanji).then(buffer => {
    debugger;
    let pngFile = './kanjipngs/' + kanjiUnicode + '.png';
    return new Promise((fulfill, reject) => {
      fs.writeFile(pngFile, buffer, err => {
        debugger;
        if (err) {
          reject(err);
        } else {
          fulfill();
        }
      });
    });
  });
  promises.push(promise);
}

Promise.all(promises).then(() => {});