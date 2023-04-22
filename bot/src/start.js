const Monochrome = require('monochrome-bot');
const { ReactionButtons } = require('erex');
const path = require('path');
const fs = require('fs');
const Bunyan = require('bunyan');
const StackdriverBunyan = require('@google-cloud/logging-bunyan').LoggingBunyan;
const Canvas = require('canvas');
const { initializeFonts, initializeResourceDatabase } = require('kotoba-node-common');
const { DB_CONNECTION_STRING } = require('kotoba-node-common').database;
const loadScheduleIntervals = require('./discord/schedule_helper.js').loadIntervals;
const loadShiritoriForeverChannels = require('./discord/shiritori_forever_helper.js').loadChannels;
const config = require('../../config/config.js').bot;
const globals = require('./common/globals.js');
const { handleInteraction } = require('./discord/components/interactive_message.js');

const { ConsoleLogger } = Monochrome;

const GCLOUD_KEY_PATH = path.join(__dirname, '..', '..', 'config', 'gcloud_key.json');
const hasGCloudKey = fs.existsSync(GCLOUD_KEY_PATH);

const { apiKeys } = config;

function createLogger() {
  // Use Bunyan logger connected to StackDriver if GCP credentials are present.
  if (hasGCloudKey) {
    const consoleLogger = new ConsoleLogger();
    const stackDriverLogger = new StackdriverBunyan({ keyFilename: GCLOUD_KEY_PATH });

    stackDriverLogger.on('error', (err) => {
      consoleLogger.warn({ event: 'BUNYAN LOGGING ERROR', err });
    });

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

  const storage = config.useMongo
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
    inviteLinkDmReply: 'You can invite me to your server with this link! https://discord.com/oauth2/authorize?client_id=251239170058616833&scope=bot&permissions=117824',
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

  const monochrome = new Monochrome(options);

  let handledReady = false;
  monochrome.getErisBot().on('ready', () => {
    if (handledReady) {
      return;
    }

    monochrome.reactionButtonManager = new ReactionButtons
      .ReactionButtonManager(monochrome.getErisBot().user.id);

    monochrome.getErisBot().on('messageReactionAdd', (message, emoji, member) => {
      monochrome.reactionButtonManager.handleMessageReactionAdd(message, emoji, member.id);
    });

    monochrome.getErisBot().on('messageReactionRemove', (message, emoji, userId) => {
      monochrome.reactionButtonManager.handleMessageReactionRemove(message, emoji, userId);
    });

    monochrome.getErisBot().on('interactionCreate', (interaction) => {
      interaction.author = interaction.user ?? interaction.member?.user;

      if (monochrome.blacklist_.isUserBlacklistedQuick(interaction.author.id)) {
        return;
      }

      if (interaction.type === 3) {
        return handleInteraction(interaction)
          .catch((err) => {
            monochrome.getLogger().error({
              event: 'INTERACTION HANDLER ERROR',
              err,
              detail: `Server: ${interaction.guildID ?? 'DM'} - Interactive message ID: ${err.interactiveMessageId}`,
            });
          });
      }

      monochrome.commandManager_.processInteraction(monochrome.bot_, interaction);
    });

    loadScheduleIntervals(monochrome);

    process.on('uncaughtException', (err) => {
      monochrome.getLogger().fatal({ event: 'UNCAUGHT_EXCEPTION', err });
    });

    handledReady = true;
  });

  return monochrome;
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
  const fontsPath = path.join(__dirname, '..', '..', 'resources', 'fonts');

  const resourceDatabasePath = path.join(__dirname, '..', 'generated', 'resources.dat');
  globals.resourceDatabase = await initializeResourceDatabase(resourceDatabasePath);

  globals.fontHelper = initializeFonts(fontsPath, globals.resourceDatabase, Canvas);

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
