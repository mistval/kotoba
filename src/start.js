const reload = require('require-reload')(require);
const Monochrome = require('monochrome-bot');
const globals = require('./common/globals.js');
const path = require('path');
const mkdirp = require('mkdirp');

const apiKeys = reload('./../config/api_keys.json');
const loadQuizDecks = reload('./common/quiz/deck_loader.js').loadDecks;
const config = reload('./../config/config.json');
const loadShiritoriForeverChannels = reload('./discord/shiritori_forever_helper.js').loadChannels;

function createBot() {
  mkdirp.sync(path.join(__dirname, '..', 'data'));

  const commandsDirectoryPath = path.join(__dirname, 'discord_commands');
  const messageProcessorsDirectoryPath = path.join(__dirname, 'discord_message_processors');
  const settingsFilePath = path.join(__dirname, 'bot_settings.js');
  const logDirectoryPath = path.join(__dirname, '..', 'data', 'logs');
  const persistenceDirectoryPath = path.join(__dirname, '..', 'data', 'monochrome-persistence');

  let options = {
    prefixes: ['k!'],
    commandsDirectoryPath,
    messageProcessorsDirectoryPath,
    logDirectoryPath,
    settingsFilePath,
    persistenceDirectoryPath,
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
      'hard to get',
    ],
    statusRotationIntervalInSeconds: 600,
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
    },
  };

  options = Object.assign(options, config);
  return new Monochrome(options);
}

function checkApiKeys(monochrome) {
  const logger = monochrome.getLogger();

  if (!apiKeys.YOUTUBE) {
    logger.logFailure('YOUTUBE', 'No Youtube API key present in ./api_keys.json. The jukebox command will not work.');
  }

  if (!apiKeys.GOOGLE_TRANSLATE) {
    logger.logFailure('TRANSLATE', 'No Google API key present in ./api_keys.json. The translate command will not work.');
  }

  if (!apiKeys.FORVO) {
    logger.logFailure('PRONOUNCE', 'No Forvo API key present in ./api_keys.json. The pronounce command will not show audio files.');
  }
}

function saveGlobals(monochrome) {
  globals.logger = monochrome.getLogger();
  globals.persistence = monochrome.getPersistence();
  globals.monochrome = monochrome;
}

const monochrome = createBot();
checkApiKeys(monochrome);
saveGlobals(monochrome);
monochrome.connect();
loadQuizDecks();
loadShiritoriForeverChannels(monochrome);
