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
  constructor(settingsFilesPaths, logger) {
    this.logger_ = logger;
    this.settingsFilesPaths_ = settingsFilesPaths;
    this.rootSettingsCategory_;
  }

  /**
  * Loads settings categories. Can be called to reload settings that have been edited.
  * @param {object} config - The bot config
  */
  load(config, extraBaseCategoriesData) {
    const loggerTitle = 'SETTINGS MANAGER';
    let categories = [];
    for (let settingsFilePath of this.settingsFilesPaths_) {
      try {
        let categoriesData = reload(settingsFilePath);
        if (!Array.isArray(categoriesData)) {
          categoriesData = [categoriesData];
        }
        if (!categoriesData.every(category => category.type !== CATEGORY_IDENTIFIER)) {
          throw new Error('At least one of the childrens\' type properties is not ' + CATEGORY_IDENTIFIER + '. All root settings nodes must be categories.');
        }
        for (let category of categoriesData) {
          let newCategory = new SettingsCategory(category, '', CATEGORY_IDENTIFIER, SETTING_IDENTIFIER, config);
          if (this.categories.find(otherCategory => otherCategory.getFullyQualifiedName() === newCategory.getFullyQualifiedName())) {
            throw new Error('Two categories have the same fully qualified name: ' + newCategory.getFullyQualifiedName());
          }
          this.categories.push(newCategory);
        }
      } catch (err) {
        this.logger_.logFailure(loggerTitle, 'Failed to load settings category from file: ' + settingsFilePath, internalErr);
      }
    }

    for (let category of extraBaseCategoriesData) {
      categories.push(new SettingsCategory(category, '', CATEGORY_IDENTIFIER, SETTING_IDENTIFIER, config));
    }

    try {
      this.rootSettingsCategory_ = SettingsCategory.createRootCategory(categories, CATEGORY_IDENTIFIER, SETTING_IDENTIFIER, config);
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
