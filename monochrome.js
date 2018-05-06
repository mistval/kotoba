'use strict'
const reload = require('require-reload')(require);
const monochrome = reload('monochrome-bot');
const fs = require('fs');
const webserver = require('./webserver/webserver.js');

let configFilePath = __dirname + '/config.json';
let commandsDirectoryPath = __dirname + '/commands';
let messageProcessorsDirectoryPath = __dirname + '/message_processors';
let settingsFilePath = __dirname + '/server_settings.json';
let logsDirectoryPath = __dirname + '/logs';

function onShutdown(bot) {
  return quizManager.stopAllQuizzes();
}

// The bot must be instantiated before anything relying on monochrome components (like quiz manager) can be used.
// (That's an oversight and should be corrected)
let bot = new monochrome({configFilePath, commandsDirectoryPath, messageProcessorsDirectoryPath, settingsFilePath, logsDirectoryPath, onShutdown});

const quizManager = reload('./kotoba/quiz/manager.js');

if (!fs.existsSync(settingsFilePath)) {
  settingsFilePath = undefined;
}

// EPIC HACK. This prevents the bot from responding to !j in specified servers, due to collision with
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

const CONTACT_SPAM_INTERVAL_IN_MS = 120000;
const MAX_CONTACTS_IN_INTERVAL = 10;

let contactsSinceTimerReset = 0;
let contactEnabled = true;
let timer;

bot.connect();

webserver.start((email, message) => {
  if (contactEnabled === false) {
    return Promise.reject();
  }
  if (contactsSinceTimerReset >= MAX_CONTACTS_IN_INTERVAL) {
    bot.getErisBot().createMessage('408587745745698826', {embed: {title: 'Spam detected, contact disabled'}}).catch();
    contactEnabled = false;
    return Promise.reject();
  }
  if (!timer) {
    timer = setTimeout(() => {
      contactsSinceTimerReset = 1;
      timer = undefined;
    }, CONTACT_SPAM_INTERVAL_IN_MS);
  }
  ++contactsSinceTimerReset;
  return bot.getErisBot().createMessage('408587745745698826', 'Contact from: ' + email + '\n\n' + message);
});
