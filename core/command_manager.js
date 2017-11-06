'use strict'
const reload = require('require-reload')(require);
const Command = reload('./command.js');
const FileSystemUtils = reload('./util/file_system_utils.js');
const ReloadCommand = reload('./commands/reload.js');
const PublicError = reload('./public_error.js');

const COMMAND_CATEGORY_NAME = 'enabled_commands';

function handleCommandError(msg, err, config, logger) {
  const loggerTitle = 'COMMAND';
  let errDescription = err.logDescription;
  let publicMessage = err.publicMessage;
  if (!publicMessage && err.message.indexOf('Missing Permissions') !== -1 && config.missingPermissionsErrorMessage) {
    publicMessage = config.missingPermissionsErrorMessage;
    if (!errDescription) {
      errDescription = 'Missing permissions';
    }
  }
  if (!errDescription) {
     errDescription = 'Exception or promise rejection'
  }
  if (!publicMessage) {
    publicMessage = config.genericErrorMessage;
  }
  let internalErr = err instanceof PublicError ? err.internalErr : err;
  if (publicMessage) {
    msg.channel.createMessage(publicMessage);
  }
  logger.logInputReaction(loggerTitle, msg, '', false, errDescription);
  if (internalErr) {
    logger.logFailure(loggerTitle, 'Command \'' + msg.content + '\' threw an exception or returned a promise that rejected.', internalErr);
  }
}

function getDuplicateAlias(command, otherCommands) {
  for (let alias of command.aliases) {
    if (otherCommands.find(cmd => cmd.aliases.indexOf(alias) !== -1)) {
      return alias;
    }
  }
}

function createSettingsForCommands(userCommands) {
  return userCommands
    .map(command => command.createEnabledSetting())
    .filter(setting => !!setting);
}

function createSettingsCategoryForCommands(userCommands) {
  return {
    type: 'CATEGORY',
    userFacingName: COMMAND_CATEGORY_NAME,
    children: createSettingsForCommands(userCommands),
  }
}

/**
* Loads and executes commands in response to user input.
* @param {function} [reloadAction] - A lambda for the reload command to call to execute a reload.
*/
class CommandManager {
  /**
  * @param {String} directory - The directory from which to load commands.
  * @param {Function} reloadAction - The function that the reload command should invoke to initiate a reload.
  * @param {Logger} logger - The logger to log to.
  */
  constructor(directory, reloadAction, logger, config, settingsGetter) {
    this.commands_ = [];
    this.reloadAction_ = reloadAction;
    this.logger_ = logger;
    this.directory_ = directory;
    this.config_ = config;
    this.settingsGetter_ = settingsGetter;
  }

  /**
  * Loads commands. Can be called to reload commands.
  */
  load(extraCommandDatas) {
    const loggerTitle = 'COMMAND MANAGER';
    let commandDatasToLoad = extraCommandDatas || [];
    this.commands_ = [];
    return FileSystemUtils.getFilesInDirectory(this.directory_).then((commandFiles) => {
      for (let commandFile of commandFiles) {
        try {
          let commandData = reload(commandFile);
          commandDatasToLoad.push(commandData);
        } catch (e) {
          this.logger_.logFailure(loggerTitle, 'Failed to load command from file: ' + commandFile, e);
          continue;
        }
      }

      for (let commandData of commandDatasToLoad) {
        const failureMessageStart = 'Failed to load command with uniqueId: ' + commandData.uniqueId;
        let command;
        try {
          command = new Command(commandData, this.config_.settingsCategorySeparator);
        } catch (err) {
          this.logger_.logFailure(loggerTitle, failureMessageStart + '.', err);
          continue;
        }
        if (commandData.uniqueId && this.commands_.find(cmd => cmd.uniqueId === commandData.uniqueId)) {
          this.logger_.logFailure(loggerTitle, failureMessageStart + '. Error: uniqueId: ' + commandData.uniqueId + ' not unique');
          continue;
        }

        let duplicateAlias = getDuplicateAlias(command, this.commands_);
        if (duplicateAlias) {
          this.logger_.logFailure(loggerTitle, FailedToLoadMessageStart + commandFile + '. Error: alias: ' + duplicateAlias + ' is not unique');
          continue;
        }

        this.commands_.push(command);
      }

      if (this.reloadAction_) {
        this.commands_.push(new Command(new ReloadCommand(this.reloadAction_)));
      }
    }).catch(err => {
      this.logger_.logFailure(loggerTitle, 'Error loading commands.', err);
    });
  }

  /**
  * Collects any settings that the command subsystem wants to register with the settings subsystem.
  * @returns {Array<SettingsCategory>} The settings categories this subsystem wants to register.
  */
  collectSettingsCategories() {
    return [createSettingsCategoryForCommands(this.commands_)];
  }

  /**
  * Tries to process user input as a command.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {Eris.Message} msg - The msg to process.
  * @returns {Boolean} True if the input is processed as a command, false otherwise.
  *   Note: this returning true does not mean that a command was necessarily successful. It only means that the input was handed to a command to process.
  */
  processInput(bot, msg) {
    const loggerTitle = 'COMMAND';
    let msgContent = msg.content.replace('\u3000', ' ');
    let spaceIndex = msgContent.indexOf(' ');
    let commandText = '';
    if (spaceIndex === -1) {
      commandText = msgContent;
    } else {
      commandText = msgContent.substring(0, spaceIndex);
    }
    commandText = commandText.toLowerCase();

    for (let command of this.commands_) {
      if (command.aliases.indexOf(commandText) !== -1) {
        let suffix = '';
        if (spaceIndex !== -1) {
          suffix = msgContent.substring(spaceIndex + 1, msgContent.length).trim();
        }
        try {
          Promise.resolve(command.handle(bot, msg, suffix, this.config_, this.settingsGetter_, COMMAND_CATEGORY_NAME)).then(result => {
            let success = typeof result !== typeof '';
            this.logger_.logInputReaction(loggerTitle, msg, '', success, result);
          }).catch(err => handleCommandError(msg, err, this.config_, this.logger_));
        } catch (err) {
          handleCommandError(msg, err, this.config_, this.logger_);
        }

        return true;
      }
    }

    return false;
  }
}

module.exports = CommandManager;
