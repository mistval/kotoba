const reload = require('require-reload')(require);
const YoutubeApi = reload('./../kotoba/youtube_api_utils.js');
const apiKeys = reload('./../kotoba/api_keys.js');
const { PublicError } = reload('monochrome-bot');
const retryPromise = reload('./../kotoba/util/retry_promise.js');

module.exports = {
  commandAliases: ['k!jukebox'],
  canBeChannelRestricted: true,
  uniqueId: 'jukebox409453',
  cooldown: 5,
  shortDescription: 'I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link.',
  longDescription: 'I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link. Songs are chosen from this playlist: https://www.youtube.com/watch?v=iyL_SXBlNIk&list=PL1oF0LpY0BK5BAWpSp55KT3TQVKierClZ. There are about 800 songs.',
  initialize(monochrome) {
    const logger = monochrome.getLogger();
    this.videoUris_ = [];
    if (apiKeys.YOUTUBE) {
      retryPromise(() => YoutubeApi.getAllLinksInPlaylist('PL1oF0LpY0BK5BAWpSp55KT3TQVKierClZ'), 5).then((links) => {
        this.videoUris_ = links;
      }).catch((err) => {
        logger.logFailure('YOUTUBE', 'Failed to load playlist.', err);
      });
    }
  },
  action(erisBot, monochrome, msg) {
    const logger = monochrome.getLogger();

    if (this.videoUris_.length === 0) {
      throw PublicError.createWithCustomPublicMessage('No tracks available. Maybe they just have not loaded yet. Try again soon.', true, 'Tracks not available');
    }
    const random = Math.floor(Math.random() * this.videoUris_.length);
    const link = this.videoUris_[random];
    msg.channel.createMessage(link, null, msg);
    logger.logSuccess('YOUTUBE', `Sent link: ${link}`);
  },
};
