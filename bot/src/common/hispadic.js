const axios = require('axios').create({ timeout: 10000 });
const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');
const edictIndex = require('edict-index');

function decompress(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const hispadicEntry = zip.getEntry('hispadic.utf8');
  const hispadic = zip.readAsText(hispadicEntry);
  return hispadic;
}

async function getHispadicUtf8() {
  const cachedFilePath = path.join(__dirname, '..', '..', 'generated', 'hispadict_utf8.txt');

  try {
    return await fs.readFile(cachedFilePath, 'utf8');
  } catch (err) {
    // Continue to download and convert the file.
  }

  // Download Hispadic as compressed UTF8 file.
  const response = await axios.get(
    'https://sites.google.com/site/hispadic/download/hispadic.zip',
    { responseType: 'arraybuffer' },
  );

  // Decompress it
  const zippedHispadicBuffer = Buffer.from(response.data);
  const hispadicBuffer = await decompress(zippedHispadicBuffer);

  // Write it to disk for next time.
  await fs.writeFile(cachedFilePath, hispadicBuffer);

  // Stringify it and return.
  return hispadicBuffer.toString('utf8');
}

async function getIndex() {
  const hispadic = await getHispadicUtf8();
  const index = edictIndex.buildIndex(hispadic);

  return index;
}

module.exports = getIndex();
