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
  let commandsDirectoryPath = __dirname + '/discord_commands';
  let messageProcessorsDirectoryPath = __dirname + '/discord_message_processors';
  let settingsFilePath = __dirname + '/user_settings.js';
  let logDirectoryPath = __dirname + '/../logs';

  let bot = new monochrome({
    botToken: config.token,
    botAdminIds: config.adminIds,
    prefixes: ['k!'],
    commandsDirectoryPath: commandsDirectoryPath,
    messageProcessorsDirectoryPath: messageProcessorsDirectoryPath,
    logDirectoryPath: logDirectoryPath,
    settingsFilePath: settingsFilePath,
    discordBotsDotOrgAPIKey: config.discordBotsDotOrgAPIKey,
    botsDotDiscordDotPwAPIKey: config.botsDotDiscordDotPwAPIKey,
    useANSIColorsInLogFiles: true,
    serverAdminRoleName: 'kotoba',
    genericErrorMessage: 'Sorry, there was an error with that command. It has been logged and will be addressed.', // (optional) If a command errors and that error escapes into core code, this message will be sent to the channel.
    missingPermissionsErrorMessage: 'I do not have permission to reply to that command in this channel. A server admin can give me the permissions I need in the channel settings. I need permission to **embed links**, **attach files**, and **add reactions**. If you do not want this command to be used in this channel, consider using **<prefix>settings** to disable it.',
    genericDMReply: 'Say **<prefix>help** to see my commands!',
    genericMentionReply: 'Hi <@user>, say **<prefix>help** to see my commands!',
    inviteLinkDmReply: 'You can invite me to your server with this link! https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot',
    statusRotation: [
      '@ me for help!',
      'Half Life 3',
      '@ me for help!',
      'shiritori',
      '@ me for help!',
      'Russian Roulette',
      '@ me for help!',
      'アタシは子猫なのよ',
      '@ me for help!',
      'with fire',
      '@ me for help!',
      'hard to get'
    ],
    statusRotationIntervalInSeconds: 600, // (optional) How often to change status.
    startWebServer: true,
    erisOptions: {
      maxShards: 'auto'
    }
  });

  let shortDictionaryCommandDisabledServers = [
    '116379774825267202',
    '163547731137265664',
  ];

  let oldOnMessageCreate = bot.onMessageCreate_;
  bot.onMessageCreate_ = msg => {
    // EPIC HACK. This prevents the bot from responding to !j in specified servers, due to collision with
    // other bots in those servers.
    if (msg.content.startsWith('!j') && msg.channel.guild && ~shortDictionaryCommandDisabledServers.indexOf(msg.channel.guild.id)) {
      return;
    }
    // EPIC HACK. This allows the !j command to keep working temporarly
    // so that users have time before they need to either add ! as a prefix
    // or start using k!.
    if (msg.content.startsWith('!j') && bot.getPersistence().getPrefixesForServerId(msg.channel.guild ? msg.channel.guild.id : msg.channel.id).indexOf('!') === -1) {
      msg.content = msg.content.replace('!j', 'k!j');
      msg.wasShortJishoAlias = true;
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
