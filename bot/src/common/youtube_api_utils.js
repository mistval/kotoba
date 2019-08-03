const axios = require('axios').create({ timeout: 10000 });

const API_KEY = require('./../../../config.js').bot.apiKeys.youtube;

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
    const params = {
      maxResults: 50,
      part: 'contentDetails,snippet',
      playlistId,
      key: API_KEY,
      pageToken,
    };

    const url = 'https://www.googleapis.com/youtube/v3/playlistItems';

    // We need to make the requests in sequence
    // because each one returns a token for the next page.
    // eslint-disable-next-line no-await-in-loop
    const response = await axios.get(url, { params });

    response.data.items.forEach((item) => {
      if (item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video') {
        links.push(`https://www.youtube.com/watch?v=${item.contentDetails.videoId}`);
      }
    });

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return links;
}

module.exports = {
  getAllLinksInPlaylist,
  hasApiKey,
};
