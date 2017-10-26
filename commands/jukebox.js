'use strict'
const reload = require('require-reload')(require);
const YoutubeApi = reload('./../kotoba/youtube_api_utils.js');
const logger = require('./../core/logger.js');
let videoUris = [];

YoutubeApi.getAllLinksInPlaylist('PL1oF0LpY0BK5BAWpSp55KT3TQVKierClZ').then(links => {
  videoUris = links;
}).catch(err => {
  logger.logFailure('YOUTUBE', 'Failed to load playlist.', err);
});

module.exports = {
  commandAliases: ['k!jukebox'],
  canBeChannelRestricted: true,
  uniqueId: 'jukebox409453',
  cooldown: 5,
  action(bot, msg, suffix) {
    if (videoUris.length === 0) {
      msg.channel.createMessage('No tracks available. Maybe they just have not loaded yet. Try again soon.');
      return;
    }
    let random = Math.floor(Math.random() * videoUris.length);
    bot.createMessage(msg.channel.id, videoUris[random]);
  },
};
