'use strict'
const reload = require('require-reload')(require);
const shiritoriManager = reload('./../kotoba/shiritori/shiritori_manager.js');

module.exports = {
  name: 'Shiritori Answer',
  action: (bot, msg) => {
    return shiritoriManager.processUserInput(msg.channel.id, msg.author.id, msg.content);
  }
};
