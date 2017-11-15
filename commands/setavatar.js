'use strict'
const reload = require('require-reload')(require);
const request = require('request-promise').defaults({encoding: null});
const logger = require('./../core/logger.js');
const PublicError = reload('./../core/public_error.js');

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
      throw new PublicError('Say \'}setavatar [http url]\' to set my avatar.', false, 'invalid syntax');
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
        throw new PublicError('Error updating avatar, check the logs for error info.', false, 'Error', err);
      });
    }).catch(err => {
      throw new PublicError('Error updating avatar, check the logs for error info.', false, 'Error', err);
    });
  },
};
