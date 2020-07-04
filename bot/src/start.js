const Monochrome = require('monochrome-bot');
const globals = require('./common/globals.js');
const path = require('path');
const fs = require('fs');
const config = require('./../../config/config.js').bot;
const loadShiritoriForeverChannels = require('./discord/shiritori_forever_helper.js').loadChannels;
const Bunyan = require('bunyan');
const StackdriverBunyan = require('@google-cloud/logging-bunyan').LoggingBunyan;
const Canvas = require('canvas');
const { initializeFonts, initializeResourceDatabase } = require('kotoba-node-common');
const { DB_CONNECTION_STRING } = require('kotoba-node-common').database;

const { ConsoleLogger } = Monochrome;

const GCLOUD_KEY_PATH = path.join(__dirname, '..', '..', 'config', 'gcloud_key.json');
const hasGCloudKey = fs.existsSync(GCLOUD_KEY_PATH);

const { apiKeys } = config;

function createLogger() {
  // Use Bunyan logger connected to StackDriver if GCP credentials are present.
  if (hasGCloudKey) {
    const consoleLogger = new ConsoleLogger();
    const stackDriverLogger = new StackdriverBunyan({ keyFilename: GCLOUD_KEY_PATH });
    return Bunyan.createLogger({
      name: 'kotoba-bot',
      streams: [
        stackDriverLogger.stream('info'),
        consoleLogger.stream('info'),
      ],
    });
  }

  return undefined; // Use default console logger
}

function createBot() {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });

  const commandsDirectoryPath = path.join(__dirname, 'discord_commands');
  const messageProcessorsDirectoryPath = path.join(__dirname, 'discord_message_processors');
  const settingsFilePath = path.join(__dirname, 'bot_settings.js');
  const persistenceDirectoryPath = path.join(__dirname, '..', 'data', 'monochrome-persistence');

  let storage = config.useMongo
    ? new Monochrome.Plugins.MongoStorage(DB_CONNECTION_STRING, 'kotoba', 'monochromepersistence')
    : new Monochrome.Plugins.FPersist(persistenceDirectoryPath);

  const options = {
    prefixes: ['k!'],
    commandsDirectoryPath,
    messageProcessorsDirectoryPath,
    logger: createLogger(),
    settingsFilePath,
    storage,
    useANSIColorsInLogFiles: true,
    serverAdminRoleName: 'kotoba',
    genericErrorMessage: 'Sorry, there was an error with that command. It has been logged and will be addressed.',
    missingPermissionsErrorMessage: 'I do not have permission to reply to that command in this channel. A server admin can give me the permissions I need in the channel settings. I need permission to **embed links**, **attach files**, and **add reactions**. If you do not want this command to be used in this channel, consider using **<prefix>settings** to disable it.',
    genericDMReply: 'Say **<prefix>help** to see my commands!',
    genericMentionReply: 'Hi <@user>, say **<prefix>help** to see my commands!',
    inviteLinkDmReply: 'You can invite me to your server with this link! https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot&permissions=51264',
    updateUserFromRestBucketClearInterval: 21600000, // six hours
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
      restMode: true,
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
        TYPING_START: true,
      },
      intents: [
        'guilds',
        'guildMessages',
        'guildMessageReactions',
        'guildVoiceStates',
        'directMessages',
        'directMessageReactions',
      ],
    },
    ...config,
  };

  return new Monochrome(options);
}

function checkApiKeys(monochrome) {
  const logger = monochrome.getLogger();

  if (!apiKeys.youtube) {
    logger.warn({
      event: 'YOUTUBE KEY MISSING',
      detail: 'No Youtube API key present in config.js. The jukebox command will not work.',
    });
  }

  if (!apiKeys.googleTranslate) {
    logger.warn({
      event: 'GOOGLE TRANSLATE KEY MISSING',
      detail: 'No Google API key present in config.js. The translate command will not work.',
    });
  }

  if (!apiKeys.forvo) {
    logger.warn({
      event: 'FORVO KEY MISSING',
      detail: 'No Forvo API key present in config.js. The pronounce command will not show audio files.',
    });
  }

  if (!hasGCloudKey) {
    logger.warn({
      event: 'GOOGLE CLOUD CREDENTIALS MISSING',
      detail: `No Google Cloud service account credentials found at ${GCLOUD_KEY_PATH}. Logs won't be sent to Stackdriver.`,
    });
  }
}

async function start() {
  const fontPath = path.join(__dirname, '..', '..', 'resources', 'fonts');
  const fontCharacterMapPath = path.join(__dirname, '..', 'generated', 'font_character_map.json');
  globals.fontHelper = initializeFonts(fontPath, fontCharacterMapPath, Canvas);

  const resourceDatabasePath = path.join(__dirname, '..', 'generated', 'resources.dat');
  const pronunciationDataPath = path.join(__dirname, '..', '..', 'resources', 'dictionaries', 'pronunciation.json');
  const randomWordDataPath = path.join(__dirname, '..', '..', 'resources', 'dictionaries', 'random_words.json');
  const wordFrequencyDataPath = path.join(__dirname, '..', '..', 'resources', 'dictionaries', 'frequency.json');
  const edictDataPath = path.join(__dirname, '..', '..', 'resources', 'dictionaries', 'edictutf8.txt');
  globals.resourceDatabase = await initializeResourceDatabase(
    resourceDatabasePath,
    pronunciationDataPath,
    randomWordDataPath,
    wordFrequencyDataPath,
    edictDataPath,
  );

  const monochrome = createBot();

  globals.logger = monochrome.getLogger();
  globals.persistence = monochrome.getPersistence();
  globals.monochrome = monochrome;

  checkApiKeys(monochrome);
  monochrome.connect();
  loadShiritoriForeverChannels(monochrome);
}

start().catch((err) => {
  console.warn(err);
  process.exit(1);
});
