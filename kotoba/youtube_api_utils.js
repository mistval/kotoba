'use strict'
const reload = require('require-reload')(require);
const request = require('request-promise');
const API_KEY = reload('./api_keys.js').YOUTUBE;

exports.getAllLinksInPlaylist = function(playlistId, pageToken) {
  if (!API_KEY) {
    return Promise.reject(new Error('No Youtube API key'));
  }
  return request({
    uri: 'https://www.googleapis.com/youtube/v3/playlistItems',
    qs: {
      maxResults: 50,
      part: 'contentDetails,snippet',
      playlistId: playlistId,
      key: API_KEY,
      pageToken: pageToken,
    },
    json: true,
    timeout: 10000
  }).then(data => {
    if (data.nextPageToken) {
      return module.exports.getAllLinksInPlaylist(playlistId, data.nextPageToken).then(resultArray => {
        return addLinksFromPlaylistData(data, resultArray);
      });
    } else {
      let resultArray = [];
      return addLinksFromPlaylistData(data, resultArray);
    }
  });
};

function addLinksFromPlaylistData(data, resultArray) {
  for (let item of data.items) {
    if (item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video') {
      resultArray.push('https://www.youtube.com/watch?v=' + item.contentDetails.videoId);
    }
  }

  return resultArray;
}
