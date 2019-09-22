const axios = require('axios').create({ timeout: 10000 });

const API_KEY = require('./../../../config/config.js').bot.apiKeys.forvo;

const NOT_RESPONDING_ERROR_MESSAGE = 'No response';
const preferredLanguageNames = ['Japanese', 'English'];
const langCodeForLangName = {
  Japanese: 'ja',
  English: 'en',
};

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
  let itemsToUse = [];
  for (let i = 0; i < preferredLanguageNames.length && itemsToUse.length === 0; i += 1) {
    const preferredLanguageName = preferredLanguageNames[i];
    itemsToUse = items.filter(item => item.langname === preferredLanguageName);
  }

  if (itemsToUse.length === 0) {
    itemsToUse = items;
  }

  return itemsToUse
    .sort((a, b) => b.num_positive_votes - a.num_positive_votes)
    .map(item => ({
      langname: item.langname,
      word: item.word,
      userName: item.username,
      gender: item.sex === 'm' ? 'Male' : 'Female',
      country: item.country,
      audioUri: item.pathmp3 || item.pathogg,
      audioType: (item.pathmp3 && 'mp3') || (item.pathogg && 'ogg') || undefined,
      forvoUri: `https://forvo.com/word/${item.word}/#${langCodeForLangName[item.langname] || ''}`,
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
    const response = await axios.get(getApiUriForQuery(query));
    return parseResponse(response.data, query);
  } catch (e) {
    return rethrowError(e);
  }
}

module.exports = search;
