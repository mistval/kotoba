'use strict'
const reload = require('require-reload')(require);
const shiritoriManager = reload('./../kotoba/shiritori/shiritori_manager.js');

module.exports = {
  name: 'Shiritori Answer',
  action: (bot, msg) => {
    if (msg.content.toLowerCase() === 'join') {
      return shiritoriManager.join(msg.channel.id, msg.author.id, msg.author.username);
    }
    return shiritoriManager.processUserInput(msg.channel.id, msg.author.id, msg.content);
  }
};
