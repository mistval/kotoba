'use strict'
const reload = require('require-reload')(require);
const Eris = require('eris');
const request = require('request-promise');
const logger = require('./core/logger.js');
const persistence = require('./core/persistence.js');
const navigationManager = require('./core/navigation_manager.js');

const LOGGER_TITLE = 'CORE';
const UPDATE_STATS_INTERVAL_IN_MS = 7200000; // 2 hours
const SETTINGS_FILE_PATH = __dirname + '/server_settings.json';
const UserMentionReplaceRegex = new RegExp('<@user>', 'g');
const UserNameReplaceRegex = new RegExp('<user>', 'g');

let messageProcessorManager;
let commandManager;
let settingsManager;
let config;
let RepeatingQueue;

let botMentionString = '';
persistence.init();
config = reload('./config.json');
logger.initialize(__dirname + '/' + config.logsDirectory, config.useANSIColorsInLogFiles);
reloadCore();

function reloadCore() {
  logger.reload();
  persistence.reload();
  navigationManager.reload();

  settingsManager = new (reload('./core/settings_manager.js'))(logger, config);
  let settingsManagerCommands = settingsManager.collectCommands();
  let settingsGetter = settingsManager.createSettingsGetter();
  messageProcessorManager = new (reload('./core/message_processor_manager.js'))(__dirname + '/message_processors/', logger);
  commandManager = new (reload('./core/command_manager.js'))(__dirname + '/commands', reloadCore, logger, config, settingsGetter);
  RepeatingQueue = reload('./core/repeating_queue.js');
  commandManager.load(settingsManagerCommands).then(() => {
    settingsManager.load(commandManager.collectSettingsCategories(), [SETTINGS_FILE_PATH], config);
  });
  messageProcessorManager.load();
}

function validateConfiguration(config) {
  let errorMessage;
  if (!config.botToken) {
    errorMessage = 'Invalid botToken value in configuration (should be non-empty string)';
  } else if (typeof config.serverAdminRoleName !== typeof '') {
    errorMessage = 'Invalid serverAdminRoleName value in configuration (should be string, use empty string for no server entry message)';
  } else if (!config.botAdminIds || !Array.isArray(config.botAdminIds)) {
    errorMessage = 'Invalid botAdminIds value in configuration (should be array of strings)';
  } else if (typeof config.genericErrorMessage !== typeof '') {
    errorMessage = 'Invalid genericErrorMessage value in configuration (should be string, use empty string for no error message)';
  } else if (typeof config.genericDMReply !== typeof '') {
    errorMessage = 'Invalid genericDMReply value in configuration (should be string, use empty string for no DM reply message)';
  } else if (typeof config.genericMentionReply !== typeof '') {
    errorMessage = 'Invalid genericMentionReply value in configuration (should be string, use empty string for no reply message)';
  } else if (typeof config.discordBotsDotOrgAPIKey !== typeof '') {
    errorMessage = 'Invalid discordBotsDotOrgAPIKey value in configuration (should be string, use empty string for no key)';
  } else if (typeof config.logsDirectory !== typeof '') {
    errorMessage = 'Invalid logsDirectory value in configuration (should be string, use empty string for no logging to file)';
  } else if (typeof config.useANSIColorsInLogFiles !== typeof true) {
    errorMessage = 'Invalid useANSIColorsInLogFiles value in configuration (should be boolean)';
  } else if (!config.statusRotation || !Array.isArray(config.statusRotation)) {
    errorMessage = 'Invalid statusRotation value in configuration (should be array, use empty array for no status. 1 value array for no rotation.)';
  } else if (typeof config.statusRotationIntervalInSeconds !== typeof 2) {
    errorMessage = 'Invalid statusRotationIntervalInSeconds value in configuration (should be a number of seconds (not a string))';
  } else if (config.botAdminIds.some(id => typeof id !== typeof '')) {
    errorMessage = 'Invalid botAdminId in configuration (should be a string (not a number! put quotes around it))';
  } else if (config.statusRotation.some(status => typeof status !== typeof '')) {
    errorMessage = 'Invalid status in configuration (should be a string)';
  } else if (!config.settingsCategorySeparator || typeof config.settingsCategorySeparator !== typeof '' || config.settingsCategorySeparator.indexOf(' ') !== -1) {
    errorMessage = 'Invalid settingsCategorySeparator in configuration (should be a string with no spaces)';
  } else if (!config.serverSettingsCommandAliases || config.serverSettingsCommandAliases.some(alias => typeof alias !== typeof '')) {
    errorMessage = 'Invalid serverSettingsCommandAliases in configuration (should be an array of strings)';
  }

  if (errorMessage) {
    logger.logFailure('CONFIG', errorMessage);
    throw new Error(errorMessage);
  }
}

validateConfiguration(config);
let bot = new Eris(config.botToken);
let statusQueue = new RepeatingQueue(config.statusRotation);

function updateDiscordBotsDotOrg(config, bot) {
  if (!config.discordBotsDotOrgAPIKey) {
    return;
  }
  request({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.discordBotsDotOrgAPIKey,
      'Accept': 'application/json',
    },
    uri: 'https://discordbots.org/api/bots/' + bot.user.id + '/stats',
    body: '{"server_count": ' + bot.guilds.size.toString() + '}',
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, 'Sent stats to discordbots.org: ' + bot.guilds.size.toString() + ' servers.');
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error sending stats to discordbots.org', err);
  });
}

function updateBotsDotDiscordDotPw(config, bot) {
  if (!config.botsDotDiscordDotPwAPIKey) {
    return;
  }
  request({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.botsDotDiscordDotPwAPIKey,
      'Accept': 'application/json',
    },
    uri: 'https://bots.discord.pw/api/bots/' + bot.user.id + '/stats',
    body: '{"server_count": ' + bot.guilds.size.toString() + '}',
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, 'Sent stats to bots.discord.pw: ' + bot.guilds.size.toString() + ' servers.');
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error sending stats to bots.discord.pw', err);
  });
}

function updateStats(config, bot) {
  updateBotsDotDiscordDotPw(config, bot);
  updateDiscordBotsDotOrg(config, bot);
}

function startUpdateStatsInterval(config, bot) {
  if (config.discordBotsDotOrgAPIKey || config.botsDotDiscordDotPwAPIKey) {
    updateStats(config, bot);
    setInterval(updateStats, UPDATE_STATS_INTERVAL_IN_MS, config, bot);
  }
}

function createDMOrMentionReply(configReply, msg) {
  try {
    let reply = configReply.replace(UserMentionReplaceRegex, '<@' + msg.author.id + '>');
    reply = reply.replace(UserNameReplaceRegex, msg.author.username);
    return reply;
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Couldn\'t create DM or mention reply', err);
    return config.genericErrorMessage;
  }
}

function createGuildLeaveJoinLogString(guild) {
  try {
    let owner = guild.members.get(guild.ownerID).user;
    return guild.name + ' owned by ' + owner.username + '#' + owner.discriminator;
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Couldn\'t create join/leave guild log string', err);
    return config.genericErrorMessage;
  }
}

function rotateStatuses(config) {
  try {
    if (config.statusRotation.length > 0) {
      if (config.statusRotation.length > 1) {
        setTimeout(rotateStatuses, config.statusRotationIntervalInSeconds * 1000, config);
      }

      let nextStatus = statusQueue.pop();
      bot.editStatus({name: nextStatus});
    }
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error rotating statuses', err);
  }
}

bot.on('ready', () => {
  logger.logSuccess(LOGGER_TITLE, 'Bot ready.');
  botMentionString = '<@' + bot.user.id + '>';
  rotateStatuses(config);
  startUpdateStatsInterval(config, bot);
});

bot.on('messageCreate', (msg) => {
  if (!msg.author) {
    return; // Sometimes an empty message with no author appears. *shrug*
  }
  if (msg.author.bot) {
    return;
  }
  try {
    if (commandManager.processInput(bot, msg)) {
      return;
    }
    if (messageProcessorManager.processInput(bot, msg, config)) {
      return;
    }
    if (msg.mentions.length > 0 && msg.content.indexOf(botMentionString) === 0 && config.genericMentionReply) {
      msg.channel.createMessage(createDMOrMentionReply(config.genericMentionReply, msg));
      logger.logInputReaction('MENTION', msg, '', true);
      return;
    }
    if (!msg.channel.guild && config.genericDMReply) {
      msg.channel.createMessage(createDMOrMentionReply(config.genericDMReply, msg));
      logger.logInputReaction('DIRECT MESSAGE', msg, '', true);
      return;
    }
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error caught at top level', err);
    if (config.genericErrorMessage) {
      msg.channel.createMessage(config.genericErrorMessage);
    }
  }
});

bot.on('guildCreate', (guild) => {
  logger.logSuccess('JOINED GUILD', createGuildLeaveJoinLogString(guild));
});

bot.on('error', (err, shardId) => {
  let errorMessage = 'Error';
  if (shardId) {
    errorMessage += ' on shard ' + shardId;
  }
  logger.logFailure(LOGGER_TITLE, errorMessage, err);
});

bot.on('disconnect', () => {
  logger.logFailure(LOGGER_TITLE, 'All shards disconnected');
});

bot.on('shardDisconnect', (err, id) => {
  logger.logFailure(LOGGER_TITLE, 'Shard ' + id + ' disconnected', err);
});

bot.on('shardResume', (id) => {
  logger.logSuccess(LOGGER_TITLE, 'Shard ' + id + ' reconnected');
});

bot.on('warn', (message) => {
  logger.logFailure(LOGGER_TITLE, 'Warning: ' + message);
});

bot.on('shardReady', id => {
  logger.logSuccess(LOGGER_TITLE, 'Shard ' + id + ' connected');
});

bot.on('messageReactionAdd', (msg, emoji, userId) => {
  navigationManager.handleEmojiToggled(bot, msg, emoji, userId);
});

bot.on('messageReactionRemove', (msg, emoji, userId) => {
  navigationManager.handleEmojiToggled(bot, msg, emoji, userId);
});

bot.connect().catch(err => {
  logger.logFailure(LOGGER_TITLE, 'Error logging in', err);
});

bot.on('guildDelete', (guild, unavailable) => {
  if (!unavailable) {
    logger.logFailure('LEFT GUILD', createGuildLeaveJoinLogString(guild));
  }
});
