'use strict'
const monochrome = require('monochrome-bot');
const fs = require('fs');

let configFilePath = __dirname + '/config.json';
let commandsDirectoryPath = __dirname + '/commands';
let messageProcessorsDirectoryPath = __dirname + '/message_processors';
let settingsFilePath = __dirname + '/server_settings.json';
let logsDirectoryPath = __dirname + '/logs';

if (!fs.existsSync(settingsFilePath)) {
  settingsFilePath = undefined;
}

let bot = new monochrome(configFilePath, commandsDirectoryPath, messageProcessorsDirectoryPath, settingsFilePath, logsDirectoryPath);

// EPIC HACK. This prevents the bot from responding to !j is specified servers, due to collision with
// other bots in those servers.
let shortDictionaryCommandDisabledServers = [
  '116379774825267202',
  '163547731137265664',
];

let oldOnMessageCreate = bot.onMessageCreate_;
bot.onMessageCreate_ = msg => {
  if (msg.content.startsWith('!j') && msg.channel.guild && ~shortDictionaryCommandDisabledServers.indexOf(msg.channel.guild.id)) {
    return;
  }
  oldOnMessageCreate.call(bot, msg);
}

bot.connect();
