'use strict'
const request = require('request-promise').defaults({encoding: null});
const logger = require('monochrome-bot').logger;
const PublicError = require('monochrome-bot').PublicError;

/**
* Sets the bot avatar.
* Syntax: }setavatar [http url]
*/
module.exports = {
  commandAliases: ['}setavatar'],
  botAdminOnly: true,
  shortDescription: 'Change my avatar.',
  usageExample: '}setavatar http://url.com/image.png',
  action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage('Say \'}setavatar [http url]\' to set my avatar.', false, 'No argument');
    }
    return request({
      uri: suffix,
      json: false,
      resolveWithFullResponse: true
    }).then(response => {
      let dataUri = 'data:image/' + response.headers['content-type'] + ';base64,' + new Buffer(response.body).toString('base64');
      return bot.editSelf({avatar: dataUri}).then(() => {
        return msg.channel.createMessage('Avatar updated!');
      }).catch(err => {
        throw PublicError.createWithCustomPublicMessage('Error updating avatar, check the logs for error info.', false, '', err);
      });
    }).catch(err => {
      throw PublicError.createWithCustomPublicMessage('Error updating avatar, check the logs for error info.', false, '', err);
    });
  },
};
