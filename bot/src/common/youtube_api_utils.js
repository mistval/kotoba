

const request = require('request-promise');

const API_KEY = require('./../../config/api_keys.json').YOUTUBE;

function hasApiKey() {
  return !!API_KEY;
}

async function getAllLinksInPlaylist(playlistId) {
  if (!hasApiKey()) {
    throw new Error('No Youtube API key');
  }

  const links = [];
  let pageToken;

  do {
    // We need to make the requests in sequence
    // because each one returns a token for the next page.
    // eslint-disable-next-line no-await-in-loop
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

    data.items.forEach((item) => {
      if (item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video') {
        links.push(`https://www.youtube.com/watch?v=${item.contentDetails.videoId}`);
      }
    });

    pageToken = data.nextPageToken;
  } while (pageToken);

  return links;
}

module.exports = {
  getAllLinksInPlaylist,
  hasApiKey,
};
