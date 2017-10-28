'use strict'
const request = require('request-promise').defaults({encoding: null});
const logger = require('./../core/logger.js');
const PublicError = require('./../core/public_error.js');

/**
* Sets the bot avatar.
* Syntax: }setavatar [http url]
*/
module.exports = {
  commandAliases: ['}setavatar'],
  botAdminOnly: true,
  action(bot, msg, suffix) {
    if (!suffix) {
      msg.channel.createMessage('Say \'}setavatar [http url]\' to set my avatar.');
      return 'invalid syntax';
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
        throw new PublicError('Error updating avatar, check the logs for error info.', '', err);
      });
    }).catch(err => {
      throw new PublicError('Error updating avatar, check the logs for error info.', '', err);
    });
  },
};
