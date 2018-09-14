'use strict'
const reload = require('require-reload')(require);
const apiKeys = reload('./../api_keys.js');
const monochrome = reload('monochrome-bot');
const webserver = require('./webserver/webserver.js');
const quizManager = reload('./common/quiz/manager.js');
const globals = require('./common/globals.js');
const loadQuizDecks = reload('./common/quiz/deck_loader.js').loadDecks;
const config = reload('./../config.json');

function createBot() {
  let commandsDirectoryPath = __dirname + '/discord_commands';
  let messageProcessorsDirectoryPath = __dirname + '/discord_message_processors';
  let settingsFilePath = __dirname + '/user_settings.js';
  let logDirectoryPath = __dirname + '/../logs';

  let options = {
    prefixes: ['k!'],
    commandsDirectoryPath: commandsDirectoryPath,
    messageProcessorsDirectoryPath: messageProcessorsDirectoryPath,
    logDirectoryPath: logDirectoryPath,
    settingsFilePath: settingsFilePath,
    discordBotsDotOrgAPIKey: config.discordBotsDotOrgAPIKey,
    botsDotDiscordDotPwAPIKey: config.botsDotDiscordDotPwAPIKey,
    useANSIColorsInLogFiles: true,
    serverAdminRoleName: 'kotoba',
    genericErrorMessage: 'Sorry, there was an error with that command. It has been logged and will be addressed.',
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
    statusRotationIntervalInSeconds: 600,
    startWebServer: true,
    erisOptions: {
      maxShards: 'auto',
      messageLimit: 0,
      disableEvents: {
        GUILD_UPDATE: true,
        GUILD_BAN_ADD: true,
        GUILD_BAN_REMOVE: true,
        GUILD_MEMBER_ADD: true,
        GUILD_MEMBER_REMOVE: true,
        GUILD_MEMBER_UPDATE: true,
        MESSAGE_UPDATE: true,
        PRESENCE_UPDATE: true,
        TYPING_START: true,
      },
    }
  };

  options = Object.assign(options, config);

  let bot = new monochrome(options);

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

function saveGlobals(bot) {
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
saveGlobals(bot);
bot.connect(bot);

if (config.startWebServer) {
  startWebserver(bot);
}

loadQuizDecks();
