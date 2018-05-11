const reload = require('require-reload')(require);

const YoutubeApi = reload('./../kotoba/youtube_api_utils.js');
const apiKeys = reload('./../kotoba/api_keys.js');
const { logger, PublicError } = reload('monochrome-bot');
const retryPromise = reload('./../kotoba/util/retry_promise.js');

let videoUris = [];

if (apiKeys.YOUTUBE) {
  retryPromise(() => YoutubeApi.getAllLinksInPlaylist('PL1oF0LpY0BK5BAWpSp55KT3TQVKierClZ'), 5).then((links) => {
    videoUris = links;
  }).catch((err) => {
    logger.logFailure('YOUTUBE', 'Failed to load playlist.', err);
  });
} else {
  logger.logFailure('YOUTUBE', 'No Youtube API key present in kotoba/api_keys.js. The jukebox command will not work.');
}

module.exports = {
  commandAliases: ['k!jukebox'],
  canBeChannelRestricted: true,
  uniqueId: 'jukebox409453',
  cooldown: 5,
  shortDescription: 'I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link.',
  longDescription: 'I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link. Songs are chosen from this playlist: https://www.youtube.com/watch?v=iyL_SXBlNIk&list=PL1oF0LpY0BK5BAWpSp55KT3TQVKierClZ. There are about 800 songs.',
  action(bot, msg) {
    if (videoUris.length === 0) {
      throw PublicError.createWithCustomPublicMessage('No tracks available. Maybe they just have not loaded yet. Try again soon.', true, 'Tracks not available');
    }
    const random = Math.floor(Math.random() * videoUris.length);
    const link = videoUris[random];
    msg.channel.createMessage(link, null, msg);
    logger.logSuccess('YOUTUBE', `Sent link: ${link}`);
  },
};
