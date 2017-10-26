'use strict'
const libVersion = require('../node_modules/eris/package.json').version;
const botVersion = require('../package.json').version;

module.exports = {
  commandAliases: ['bot!about'],
  cooldown: 5,
  action(bot, msg, suffix) {
    return msg.channel.createMessage(`\`\`\`md
# monochrome

[ CREATOR ](You)
[ LIBRARY ](Eris v${libVersion})\`\`\``);
  },
};
