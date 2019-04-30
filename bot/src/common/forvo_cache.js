const globals = require('./globals.js');


const forvoSearch = require('./forvo_search.js');

const LOGGER_TITLE = 'FORVO CACHE';

async function getPronunciationClipsForWord(word) {
  let forvoResponseData;
  try {
    forvoResponseData = await forvoSearch(word);
  } catch (err) {
    globals.logger.logFailure(LOGGER_TITLE, 'Failed to query forvo', err);
    return [];
  }

  const audioClips = forvoResponseData.audioClips.filter(clipInfo => clipInfo.langname === 'Japanese');
  const audioClipWebUris = audioClips.map(clipInfo => clipInfo.audioUri);

  return audioClipWebUris;
}

module.exports = {
  getPronunciationClipsForWord,
};
