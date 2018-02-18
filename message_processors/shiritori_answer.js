'use strict'
const reload = require('require-reload')(require);
const shiritoriManager = reload('./../kotoba/shiritori/shiritori_manager.js');

module.exports = {
  name: 'Shiritori Answer',
  action: (bot, msg) => {
    let locationId = msg.channel.id;
    if (!shiritoriManager.isSessionInProgressAtLocation(locationId)) {
      return false
    }

    let userId = msg.author.id;
    let userName = msg.author.username;
    let contentLowerCase = msg.content.toLowerCase();
    if (contentLowerCase === 'join') {
      return shiritoriManager.join(locationId, userId, userName);
    } else if (contentLowerCase === 'bot leave') {
      return shiritoriManager.botLeave(locationId, userId);
    } else if (contentLowerCase === 'bot join') {
      return shiritoriManager.botJoin(locationId, userId);
    } else if (contentLowerCase === 'leave') {
      return shiritoriManager.leave(locationId, userId);
    } else {
      return shiritoriManager.processUserInput(msg.channel.id, msg.author.id, msg.content);
    }
  }
};
