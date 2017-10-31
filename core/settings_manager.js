'use strict'
const reload = require('require-reload')(require);
const SettingsCategory = reload('./settings_category.js');
const persistence = require('./persistence.js');

const CATEGORY_IDENTIFIER = 'CATEGORY';
const SETTING_IDENTIFIER = 'SETTING';

function getServerIdFromMessage(msg) {
  return msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
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

  setSetting(bot, msg, fullyQualifiedName, value, serverWide) {
    let child = this.rootSettingsCategory_.getChildForRelativeQualifiedName(fullyQualifiedName);
    let serverId = getServerIdFromMessage(msg);
    return persistence.editDataForServer(serverId, data => {
      let result = child.setNewValueFromUserFacingString(bot, msg, data.settings, value, serverWide);
      if (typeof result === typeof 'string') {
        msg.channel.createMessage(result);
      } else {
        msg.channel.createMessage(
          'Setting set! Here are the new settings for '
            + child.getFullyQualifiedName() + ':\n\n'
            + child.getConfigurationInstructionsString(bot, msg, data.settings, fullyQualifiedName));
      }
      return data;
    });
  }

  getConfigurationInstructionsString(bot, msg, desiredFullyQualifedName) {
    let child = this.rootSettingsCategory_.getChildForRelativeQualifiedName(value);
    let serverId = getServerIdFromMessage(msg);
    return persistence.getDataForServer(serverId).then(data => {
      return getConfigurationInstructionsString(bot, msg, data.settings, desiredFullyQualifiedName)
    });
  }
}

module.exports = SettingsManager;
