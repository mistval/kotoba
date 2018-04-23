const reload = require('require-reload')(require);
const request = require('request-promise');

const API_KEY = reload('./api_keys.js').FORVO;
const { logger } = reload('monochrome-bot');

const NOT_RESPONDING_ERROR_MESSAGE = 'No response';

if (!API_KEY) {
  logger.logFailure('PRONOUNCE', 'No Forvo API key present in kotoba/api_keys.js. The pronounce command will not show audio files.');
}

function getApiUriForQuery(query) {
  if (!API_KEY) {
    throw new Error('No Forvo API Key');
  }

  const uriEncodedQuery = encodeURIComponent(query);
  return `https://apifree.forvo.com/action/word-pronunciations/format/json/word/${uriEncodedQuery}/id_lang_speak/76/key/${API_KEY}/`;
}

function rethrowError(err) {
  if (!err.message.indexOf('TIMEDOUT')) {
    throw new Error(NOT_RESPONDING_ERROR_MESSAGE);
  }
  throw err;
}

function parseItems(items) {
  return items.sort((a, b) => b.num_positive_votes - a.num_positive_votes).map(item => ({
    word: item.word,
    userName: item.username,
    gender: item.sex === 'm' ? 'Male' : 'Female',
    country: item.country,
    audioUri: item.pathmp3 || item.pathogg,
    forvoUri: `https://forvo.com/word/${item.word}/#ja`,
  }));
}

function parseResponse(responseJson, query) {
  const audioClips = parseItems(responseJson.items);
  return {
    query,
    found: audioClips.length > 0,
    audioClips,
  };
}

async function search(query) {
  try {
    const responseJson = await request({
      uri: getApiUriForQuery(query),
      json: true,
      timeout: 10000,
    });

    return parseResponse(responseJson, query);
  } catch (e) {
    return rethrowError(e);
  }
}

module.exports = search;
