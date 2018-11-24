const globals = require('./globals.js');
const path = require('path');
const fs = require('fs');
const request = require('request');
const reload = require('require-reload')(require);

const forvoSearch = reload('./forvo_search.js');

const CACHE_KEY = 'FORVO CACHE';
const AUDIO_DIRECTORY = path.resolve(__dirname, '..', '..', 'generated', 'forvo_audio');
const LOGGER_TITLE = 'FORVO CACHE';

if (!fs.existsSync(AUDIO_DIRECTORY)) {
  fs.mkdirSync(AUDIO_DIRECTORY);
}

function baseNamesToAbsolutePaths(baseNames) {
  return baseNames.map(basename => path.join(AUDIO_DIRECTORY, basename));
}

// Return a concatenation of the string's char codes.
function getStringCharCodeString(word) {
  let charCodeString = '';
  for (let i = 0; i < word.length; i += 1) {
    const charCode = word.charCodeAt(i);
    charCodeString = `${charCodeString}${charCode}`;
  }

  return charCodeString;
}

function downloadAndSaveFile(webUri, diskFilePath) {
  // Apparently there's a memory leak in request-promise, so one should use
  // the regular request library when streaming the response.
  return new Promise((fulfill, reject) => {
    const writeStream = fs.createWriteStream(diskFilePath);

    writeStream.on('finish', () => {
      fulfill();
    });

    request({
      uri: webUri,
      json: false,
    },
    (err) => {
      if (err) {
        reject(err)
      }
    }).pipe(writeStream);
  });
}

function downloadAndSaveFiles(webUris, diskFilePaths) {
  const promises = webUris
    .map((webUri, index) => downloadAndSaveFile(webUri, diskFilePaths[index]));
  return Promise.all(promises);
}

async function getPronunciationClipsForWord(word) {
  const audioFileBasenamesForWord = await globals.persistence.getData(CACHE_KEY);
  const audioFileBasenames = audioFileBasenamesForWord[word];

  // If audio clips exist in the cache, return them.
  if (audioFileBasenames !== undefined) {
    globals.logger.logSuccess(LOGGER_TITLE, `Cache hit for (${word}) (${audioFileBasenames.join(', ')})`);
    return baseNamesToAbsolutePaths(audioFileBasenames);
  }

  globals.logger.logFailure(LOGGER_TITLE, `Cache miss for (${word})`);

  // If no audio clips exist in the cache, try to query Forvo.
  let forvoResponseData;
  try {
    forvoResponseData = await forvoSearch(word);
  } catch (err) {
    globals.logger.logFailure(LOGGER_TITLE, 'Failed to query forvo', err);
    return [];
  }

  // Download the audio clips from Forvo, record their location in the audioFileBasenamesForWord,
  // and return the clip URIs.

  const audioClips = forvoResponseData.audioClips.filter(clipInfo => clipInfo.langname === 'Japanese');
  const audioClipWebUris = audioClips.map(clipInfo => clipInfo.audioUri);

  const wordCharCodeString = getStringCharCodeString(word);
  const audioClipDiskFileNames = audioClips.map((clipInfo, index) => `${wordCharCodeString}_${index}.${clipInfo.audioType}`);
  const audioClipDiskFilePaths = baseNamesToAbsolutePaths(audioClipDiskFileNames);

  const promises = [];

  const recordResultPromise = globals.persistence.editData(CACHE_KEY, storedData => {
    storedData[word] = audioClipDiskFileNames;
    return storedData;
  });

  promises.push(recordResultPromise);
  promises.push(downloadAndSaveFiles(audioClipWebUris, audioClipDiskFilePaths));

  await Promise.all(promises);

  return audioClipDiskFilePaths;
}

module.exports = {
  getPronunciationClipsForWord,
};
