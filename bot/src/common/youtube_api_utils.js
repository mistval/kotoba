
const reload = require('require-reload')(require);
const request = require('request-promise');

const API_KEY = reload('./../../config/api_keys.json').YOUTUBE;

function hasApiKey() {
  return !!API_KEY;
}

function addLinksFromPlaylistData(data, inputArray) {
  const resultArray = inputArray.slice();
  data.items.forEach((item) => {
    if (item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video') {
      resultArray.push(`https://www.youtube.com/watch?v=${item.contentDetails.videoId}`);
    }
  });

  return resultArray;
}

async function getAllLinksInPlaylist(playlistId, pageToken) {
  if (!API_KEY) {
    return Promise.reject(new Error('No Youtube API key'));
  }
  const data = await request({
    uri: 'https://www.googleapis.com/youtube/v3/playlistItems',
    qs: {
      maxResults: 50,
      part: 'contentDetails,snippet',
      playlistId,
      key: API_KEY,
      pageToken,
    },
    json: true,
    timeout: 10000,
  });

  if (data.nextPageToken) {
    const resultArray = await getAllLinksInPlaylist(playlistId, data.nextPageToken);
    return addLinksFromPlaylistData(data, resultArray);
  }
  const resultArray = [];
  return addLinksFromPlaylistData(data, resultArray);
}

module.exports = {
  getAllLinksInPlaylist,
  hasApiKey,
};
