'use strict'
const reload = require('require-reload')(require);
const apiKeys = reload('./../api_keys.js');
const monochrome = reload('monochrome-bot');
const fs = require('fs');
const webserver = require('./webserver/webserver.js');
const quizManager = reload('./common/quiz/manager.js');
const globals = require('./common/globals.js');
const loadQuizDecks = reload('./common/quiz/deck_loader.js').loadDecks;
const config = reload('./../config.json');

function onShutdown(bot) {
  return quizManager.stopAllQuizzes();
}

function createBot() {
  let configFilePath = __dirname + '/../config.json';
  let commandsDirectoryPath = __dirname + '/discord_commands';
  let messageProcessorsDirectoryPath = __dirname + '/discord_message_processors';
  let settingsFilePath = __dirname + '/user_settings.js';
  let logsDirectoryPath = __dirname + '/../logs';

  let bot = new monochrome({
    configFilePath,
    commandsDirectoryPath,
    messageProcessorsDirectoryPath,
    settingsFilePath,
    logsDirectoryPath,
    onShutdown,
  });

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

  return bot;
}

function checkApiKeys(bot) {
  const logger = bot.getLogger();

  if (!apiKeys.YOUTUBE) {
    logger.logFailure('YOUTUBE', 'No Youtube API key present in ./api_keys.js. The jukebox command will not work.');
  }

  if (!apiKeys.GOOGLE_TRANSLATE) {
    logger.logFailure('TRANSLATE', 'No Google API key present in ./api_keys.js. The translate command will not work.');
  }

  if (!apiKeys.FORVO) {
    logger.logFailure('PRONOUNCE', 'No Forvo API key present in ./api_keys.js. The pronounce command will not show audio files.');
  }
}

function saveGlobalLogger(bot) {
  globals.logger = bot.getLogger();
  globals.persistence = bot.getPersistence();
}

function startWebserver(monochrome) {
  const CONTACT_SPAM_INTERVAL_IN_MS = 120000;
  const MAX_CONTACTS_IN_INTERVAL = 10;

  let contactsSinceTimerReset = 0;
  let contactEnabled = true;
  let timer;

  webserver.start(monochrome, (email, message) => {
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
}

const bot = createBot();
checkApiKeys(bot);
saveGlobalLogger(bot);
bot.connect(bot);

if (config.startWebServer) {
  startWebserver(bot);
}

loadQuizDecks();
