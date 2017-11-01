'use strict'
const reload = require('require-reload')(require);
const SettingsCategory = reload('./settings_category.js');
const persistence = require('./persistence.js');

const CATEGORY_IDENTIFIER = 'CATEGORY';
const SETTING_IDENTIFIER = 'SETTING';

function addSettingsObjectIfNotAlreadyInData(data) {
  if (!data.settings) {
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
  static createErrorResult(errorString) {
    let result = new InitiateSetSettingResult();
    result.errorString = errorString;
    return result;
  }

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
  constructor(logger) {
    this.logger_ = logger;
  }

  /**
  * Loads settings categories. Can be called to reload settings that have been edited.
  * @param {object} config - The bot config
  */
  load(settingsCategoriesData, settingsCategoriesFilePaths, config) {
    const loggerTitle = 'SETTINGS MANAGER';
    let categories = [];
    for (let settingsFilePath of settingsCategoriesFilePaths) {
      try {
        let categoryData = reload(settingsFilePath);
        categories.push(categoryData);
      } catch (err) {
        this.logger_.logFailure(loggerTitle, 'Failed to load settings category from file: ' + settingsFilePath, internalErr);
      }
    }

    try {
      this.rootSettingsCategory_ = SettingsCategory.createRootCategory(CATEGORY_IDENTIFIER, SETTING_IDENTIFIER, config);
      this.rootSettingsCategory_.setChildren(settingsCategoriesData.concat(categories));
    } catch (err) {
      this.logger_.logFailure(loggerTitle, 'Failed to load settings', err);
    }
  }

  getSetting(bot, msg, settingName) {
    let setting = this.rootSettingsCategory_.getChildForRelativeQualifiedName(settingName);
    if (setting.getFullyQualifiedName() !== settingName) {
      throw new Error('That setting doesn\'t exist in the settings hierarchy');
    }
    if (!setting.isSetting) {
      throw new Error('That setting (${settingName}) isn\'t a setting (maybe it\'s a category?)');
    }
    let serverId = getServerIdFromMessage(msg);
    return persistence.getDataForServer(serverId).then(data => {
      setting.getCurrentDatabaseFacingValue(data.settings, msg.channel.id);
    });
  }

  initiateSetSetting(bot, msg, fullyQualifiedName, value) {
    let childToEdit = this.rootSettingsCategory_.getChildForRelativeQualifiedName(fullyQualifiedName);
    if (childToEdit.getFullyQualifiedName() !== fullyQualifiedName) {
      return this.getConfigurationInstructionsString(bot, msg, fullyQualifiedName).then(resultStr => {
        return InitiateSetSettingResult.createErrorResult(resultStr);
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
    let result = InitiateSetSettingResult.createRequestInputResult(childToEdit.getRequestInputMessageString(), userResponseCallback);
    return Promise.resolve(result);
  }

  getConfigurationInstructionsString(bot, msg, desiredFullyQualifedName) {
    let child = this.rootSettingsCategory_.getChildForRelativeQualifiedName(desiredFullyQualifedName);
    let serverId = getServerIdFromMessage(msg);
    return persistence.getDataForServer(serverId).then(data => {
      addSettingsObjectIfNotAlreadyInData(data);
      return child.getConfigurationInstructionsString(bot, msg, data.settings, desiredFullyQualifedName)
    });
  }
}

function commitEdit(bot, msg, childSettingToEdit, value, scopeString) {
  let serverId = getServerIdFromMessage(msg);
  let responseString;
  return persistence.editDataForServer(serverId, data => {
    data = addSettingsObjectIfNotAlreadyInData(data);
    responseString = childSettingToEdit.setNewValueFromUserFacingString(bot, msg, data.settings, value, scopeString);
    return data;
  }).then(data => {
    return responseString;
  });
}

module.exports = SettingsManager;
