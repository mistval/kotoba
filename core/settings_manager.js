'use strict'
const reload = require('require-reload')(require);
const SettingsCategory = reload('./settings_category.js');
const persistence = require('./persistence.js');

const CATEGORY_IDENTIFIER = 'CATEGORY';
const SETTING_IDENTIFIER = 'SETTING';

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
    for (let settingsFile of this.settingsFiles_) {
      try {
        let categoriesData = reload(settingsFile);
        if (!Array.isArray(categoriesData)) {
          categoriesData = [categoriesData];
        }
        if (!categoriesData.every(category => category.type !== CATEGORY_IDENTIFIER)) {
          throw new Error('At least one of the childrens\' type properties is not ' + CATEGORY_IDENTIFIER + '. All root settings nodes must be categories.');
        }
        for (let category of categoriesData) {
          this.categories.push(new SettingsCategory(category, '', CATEGORY_IDENTIFIER, SETTING_IDENTIFIER, config));
        }
      } catch (err) {
        this.logger_.logFailure(loggerTitle, 'Failed to load settings category from file: ' + settingsFile, internalErr);
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

  getInstructionsForSetting(bot, msg, fullyQualifiedName) {
    let nearestChild = this.rootSettingsCategory_.getNearestElementForQualifierChain(fullyQualifiedName);
    let serverId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    persistence.getDataForServer(serverId).then(data => {
      return nearestChild.getConfigurationInstructionsString(data.settings);
    });
  }
}

module.exports = SettingsManager;
