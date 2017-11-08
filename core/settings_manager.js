'use strict'
const reload = require('require-reload')(require);
const SettingsCategory = reload('./settings_category.js');
const persistence = require('./persistence.js');
const userAndChannelHook = require('./message_processors/user_and_channel_hook.js');

const CATEGORY_IDENTIFIER = 'CATEGORY';
const SETTING_IDENTIFIER = 'SETTING';
const LOGGER_TITLE = 'SETTINGS';

const NEXT_STEP_EXPIRATION_TIME_IN_MS = 1000 * 120;

/**
* A command for displaying and changing settings.
*/
class SettingsCommand {
  /**
  * @param {Array<Command>} settingsManager - The settings manager controlling the settings.
  * @param {Object} config - The monochrome config object.
  */
  constructor(settingsManager, config) {
    this.commandAliases = config.serverSettingsCommandAliases;
    this.canBeChannelRestricted = false;
    this.serverAdminOnly = true;
    this.shortDescription = 'Server admins can use this command to see and configure my settings on their server.';
    this.action = (bot, msg, suffix) => this.execute_(bot, msg, suffix, settingsManager);
  }

  static registerHook_(msg, userResponseCallback) {
    let hook = userAndChannelHook.registerHook(msg.author.id, msg.channel.id, message => {
      hook.unregister();
      let result = userResponseCallback(message);
      return result.then(resultString => {
        return msg.channel.createMessage(resultString);
      });
    });
    setTimeout(() => {
        if (hook.getIsRegistered()) {
          hook.unregister();
          msg.channel.createMessage('The settings were not changed.');
        }
      },
      NEXT_STEP_EXPIRATION_TIME_IN_MS);
  }

  execute_(bot, msg, suffix, settingsManager) {
    let suffixParts = suffix.split(' ');
    if (suffixParts.length < 2) {
      return settingsManager.getConfigurationInstructionsBotContent_(bot, msg, suffix).then(responseString => {
        return msg.channel.createMessage(responseString);
      });
    } else {
      return settingsManager.initiateSetSetting_(bot, msg, suffixParts[0], suffixParts[1]).then(results => {
        if (typeof results === typeof '') {
          return msg.channel.createMessage(results);
        }
        let nextStepInstructions = results.nextStepInstructions;
        let userResponseCallback = results.userResponseCallback;
        if (userResponseCallback) {
          SettingsCommand.registerHook_(msg, userResponseCallback);
        }
        return msg.channel.createMessage(nextStepInstructions);
      });
    }
  }
}

function addSettingsObjectIfNotAlreadyInData(data) {
  if (!data.settings || !data.settings.serverSettings || !data.settings.channelSettings) {
    data.settings = {
      serverSettings: {},
      channelSettings: {},
    };
  }

  return data;
}

function getServerIdFromMessage(msg) {
  return msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
}

class InitiateSetSettingResult {
  static createRequestInputResult(requestInputString, userResponseCallback) {
    let result = new InitiateSetSettingResult();
    result.nextStepInstructions = requestInputString;
    result.userResponseCallback = userResponseCallback;
    return result;
  }

  static createNoNeedToRequestInputResult(message) {
    let result = new InitiateSetSettingResult();
    result.nextStepInstructions = message;
    return result;
  }
}

/**
* Manages the server-admin settable settings
*/
class SettingsManager {
  /**
  * @param {Array<String>} settingsFilesPaths - Paths to the files containing the settions information.
  * @param {Logger} logger - The logger to log to
  */
  constructor(logger, config) {
    this.logger_ = logger;
    this.config_ = config;
  }

  /**
  * Loads settings categories. Can be called to reload settings that have been edited.
  * @param {object} config - The bot config
  */
  load(settingsCategoriesData, settingsCategoriesFilePaths, config) {
    const loggerTitle = 'SETTINGS MANAGER';
    let categoriesFromFilesData = [];
    for (let settingsFilePath of settingsCategoriesFilePaths) {
      try {
        let categoryDatas = reload(settingsFilePath);
        for (let categoryData of categoryDatas) {
          categoriesFromFilesData.push(categoryData);
        }
      } catch (err) {
        this.logger_.logFailure(loggerTitle, 'Failed to load settings category from file: ' + settingsFilePath, err);
      }
    }

    try {
      this.rootSettingsCategory_ = SettingsCategory.createRootCategory(CATEGORY_IDENTIFIER, SETTING_IDENTIFIER, config);
      let childCategories = settingsCategoriesData.concat(categoriesFromFilesData);
      if (childCategories && childCategories.length > 0) {
        this.rootSettingsCategory_.setChildren(settingsCategoriesData.concat(categoriesFromFilesData));
      }
    } catch (err) {
      this.logger_.logFailure(loggerTitle, 'Failed to load settings', err);
    }
  }

  /**
  * @returns {Array<Object>} Command data for the commands the SettingsManager wants to register with the CommandManager.
  */
  collectCommands() {
    return [new SettingsCommand(this, this.config_)];
  }

  /**
  * I just don't want to pass the whole SettingsManager into the CommandManager.
  * I'd prefer looser coupling.
  * @returns {Object} An object with a getSettings method.
  */
  createSettingsGetter() {
    return {
      getSettings: (bot, msg, fullyQualifiedUserFacingSettingNames) => {
        return this.getSettings_(bot, msg, fullyQualifiedUserFacingSettingNames);
      }
    };
  }

  getSettings_(bot, msg, fullyQualifiedUserFacingSettingNames) {
    let serverId = getServerIdFromMessage(msg);
    if (!fullyQualifiedUserFacingSettingNames || fullyQualifiedUserFacingSettingNames.length === 0) {
      return Promise.resolve({});
    }
    return persistence.getDataForServer(serverId).then(data => {
      data = addSettingsObjectIfNotAlreadyInData(data);
      let settingsReturnBlob = {};
      for (let fullyQualifiedUserFacingSettingName of fullyQualifiedUserFacingSettingNames) {
        let setting = this.rootSettingsCategory_.getChildForFullyQualifiedUserFacingName(fullyQualifiedUserFacingSettingName);
        if (setting.getFullyQualifiedUserFacingName() !== fullyQualifiedUserFacingSettingName) {
          throw new Error('That setting doesn\'t exist in the settings hierarchy');
        }
        if (!setting.isSetting) {
          throw new Error('That setting (${settingName}) isn\'t a setting (maybe it\'s a category?)');
        }
        let settingValue = setting.getCurrentDatabaseFacingValue(msg.channel.id, data.settings);
        settingsReturnBlob[fullyQualifiedUserFacingSettingName] = settingValue;
      }
      return settingsReturnBlob;
    });
  }

  reportError_(err) {
    this.logger_.logFailure(LOGGER_TITLE, 'Error processing input as settings command.', err);
  }

  initiateSetSetting_(bot, msg, fullyQualifiedName, value) {
    let childToEdit = this.rootSettingsCategory_.getChildForFullyQualifiedUserFacingName(fullyQualifiedName);
    if (childToEdit.type === CATEGORY_IDENTIFIER) {
      return this.getConfigurationInstructionsBotContent_(bot, msg, fullyQualifiedName);
    }
    if (childToEdit.getFullyQualifiedUserFacingName() !== fullyQualifiedName) {
      return this.getConfigurationInstructionsBotContent_(bot, msg, fullyQualifiedName).then(resultStr => {
        return InitiateSetSettingResult.createNoNeedToRequestInputResult(resultStr);
      });
    }

    // If it is a DM, commit immediately. No need to ask for scope.
    if (!msg.channel.guild) {
      return commitEdit(bot, msg, childToEdit, value).then(result => {
        return InitiateSetSettingResult.createNoNeedToRequestInputResult(result);
      });
    }

    let userResponseCallback = userResponseString => {
      return commitEdit(bot, msg, childToEdit, value, userResponseString);
    };
    let result = InitiateSetSettingResult.createRequestInputResult(childToEdit.getNextStepInstructionsForSettingSetting(), userResponseCallback);
    return Promise.resolve(result);
  }

  getConfigurationInstructionsBotContent_(bot, msg, desiredFullyQualifedName) {
    let child = this.rootSettingsCategory_.getChildForFullyQualifiedUserFacingName(desiredFullyQualifedName);
    let serverId = getServerIdFromMessage(msg);
    return persistence.getDataForServer(serverId).then(data => {
      addSettingsObjectIfNotAlreadyInData(data);
      return child.getConfigurationInstructionsBotContent(msg.channel.id, data.settings, desiredFullyQualifedName);
    });
  }
}

function commitEdit(bot, msg, childSettingToEdit, value, nextStepResponseString) {
  let serverId = getServerIdFromMessage(msg);
  let responseString;
  return persistence.editDataForServer(serverId, data => {
    data = addSettingsObjectIfNotAlreadyInData(data);
    let channelsInGuild = msg.channel.guild ? msg.channel.guild.channels : [msg.channel];
    responseString = childSettingToEdit.setNewValueFromUserFacingString(msg.channel.id, channelsInGuild, data.settings, value, nextStepResponseString);
    return data;
  }).then(data => {
    return responseString;
  });
}

module.exports = SettingsManager;
