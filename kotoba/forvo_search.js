const reload = require('require-reload')(require);
const request = require('request-promise');
const forvoApiKey = reload('./api_keys.js').FORVO;

const NOT_RESPONDING_ERROR_MESSAGE = 'No response';

function getApiUriForQuery(query) {
  if (!forvoApiKey) {
    throw new Error('No Forvo API Key');
  }

  let uriEncodedQuery = encodeURIComponent(query);
  return `https://apifree.forvo.com/action/word-pronunciations/format/json/word/${uriEncodedQuery}/id_lang_speak/76/key/${forvoApiKey}/`;
}

function rethrowError(err) {
  if (!err.message.indexOf('TIMEDOUT')) {
    throw new Error(NOT_RESPONDING_ERROR_MESSAGE);
  }
  throw err;
}

function parseItems(items) {
  return items.sort((a, b) => {
    return b.num_positive_votes - a.num_positive_votes;
  }).map(item => {
    return {
      word: item.word,
      userName: item.username,
      gender: item.sex === 'm' ? 'Male' : 'Female',
      country: item.country,
      audioUri: item.pathmp3 || item.pathogg,
      forvoUri: `https://forvo.com/word/${item.word}/#ja`,
    };
  });
}

function parseResponse(responseJson, query) {
  let audioClips = parseItems(responseJson.items);
  return {
    query,
    found: audioClips.length > 0,
    audioClips,
  };
}

module.exports = async function(query) {
  try {
    let responseJson = await request({
      uri: getApiUriForQuery(query),
      json: true,
      timeout: 10000,
    });

    return parseResponse(responseJson, query);
  } catch (e) {
    rethrowError(e);
  }
};
