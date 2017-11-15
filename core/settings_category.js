'use strict'
const reload = require('require-reload')(require);
const AbstractSettingElement = reload('./abstract_setting_element.js');
const Setting = reload('./setting.js');
const assert = require('assert');
const PublicError = reload('./../core/public_error.js');

function throwError(baseString, failedBlob) {
  throw new Error(baseString + ' Failed blob: \n' + JSON.stringify(failedBlob, null, 2));
}

/**
* Represents a category of settings (a branch) as opposed to a setting (a leaf)
*/
class SettingsCategory extends AbstractSettingElement {
  /**
  * @param {Object} settingsBlob - The raw data for this category and all its children.
  * @param {String} parentFullyQualifiedName - The fully qualified name of the parent category.
  * @param {String} categoryTypeIdentifier - The string that identifies an element of the settings blob
  *   as a setting category, as opposed to a setting. Every settings element should have a type property.
  *   If the element is a settings category, the type should be the value of this argument.
  * @param {String} settingTypeIdentifier - The string that identifies an element of the settings blob
  *   as a setting leaf (as opposed to a settings category).
  * @param {Object} config - The monochrome config object.
  */
  constructor(settingsBlob, parentFullyQualifiedName, categoryTypeIdentifier, settingTypeIdentifier, config) {
    super();
    this.userFacingName_ = settingsBlob.userFacingName || '';
    this.config_ = config;
    this.settingTypeIdentifier_ = settingTypeIdentifier;
    this.settingsCategorySeparator_ = config.settingsCategorySeparator;
    this.fullyQualifiedName_ = parentFullyQualifiedName ? parentFullyQualifiedName + this.settingsCategorySeparator_ + this.userFacingName_ : this.userFacingName_;
    this.isTopLevel_ = !this.fullyQualifiedName_;
    this.categoryTypeIdentifier_ = categoryTypeIdentifier;
    this.children_ = [];
    this.type = categoryTypeIdentifier;
    this.settingsCommand_ = config.serverSettingsCommandAliases[0];
  }

  /**
  * Factory method to create the root category of the settings hierarchy. It is
  * a special snowflake with no name.
  * @param {String} categoryTypeIdentifier - The string that identifies an element of the settings blob
  *   as a setting category, as opposed to a setting. Every settings element should have a type property.
  *   If the element is a settings category, the type should be the value of this argument.
  * @param {String} settingTypeIdentifier - The string that identifies an element of the settings blob
  *   as a setting leaf (as opposed to a settings category).
  * @param {Object} config - The monochrome config object.
  * @returns {SettingsCategory} The created SettingsCategory.
  */
  static createRootCategory(categoryTypeIdentifier, settingTypeIdentifier, config) {
    return new SettingsCategory({}, '', categoryTypeIdentifier, settingTypeIdentifier, config);
  }

  /**
  * Gets the child for the specified fully qualified name, or if there isn't one, the nearest child.
  * This recurses up the settings hierarchy looking for an element whose fully qualfied name matches the
  * one we're searching for. If it doesn't find such an element, it returns the nearest one it can resolve to.
  * @param {String} desiredFullyQualifiedName - The fully qualified name for which we seek an element whose name matches.
  * @returns {(Setting|SettingsCategory)} The child for the specified fully qualified name, or if there isn't one, the nearest child.
  */
  getChildForFullyQualifiedUserFacingName(desiredFullyQualifiedName) {
    if (desiredFullyQualifiedName === this.getFullyQualifiedUserFacingName()) {
      return this;
    }
    for (let child of this.children_) {
      let foundChild = child.getChildForFullyQualifiedUserFacingName(desiredFullyQualifiedName);
      if (foundChild) {
        return foundChild;
      }
    }
    if (desiredFullyQualifiedName.startsWith(this.getFullyQualifiedUserFacingName() + this.settingsCategorySeparator_)) {
      return this;
    }
    if (this.isTopLevel_) {
      return this;
    }
    return undefined;
  }

  /**
  * @returns {String} The fully qualfied user facing name for this.
  */
  getFullyQualifiedUserFacingName() {
    return this.fullyQualifiedName_;
  }

  /**
  * As this is a category, not a setting, we should never try to set a setting on it.
  * This method with a throw is here for debugging purposes.
  */
  setNewValueFromUserFacingString() {
    throw new Error('This is a category, not a setting');
  }

  /**
  * @param {String} channelId - The channel that we are looking at the settings for.
  * @param {Object} settings - The settings object from the database for the server we are looking at the settings for.
  * @param {String} desiredFullyQualifiedUserFacingName - The fully qualified setting name we were searching for.
  *   Since getChildForFullyQualifiedName returns the nearest matching child, even if there is no exact match,
  *   the desiredFullyQualifiedUserFacingName may not be the one we landed on.
  * @returns {Object} Bot content instructing the user how to proceed at this level of the instructions hierarchy.
  */
  getConfigurationInstructionsBotContent(channelId, settings, desiredFullyQualifiedName) {
    if (!this.children_ || this.children_.length === 0) {
      return 'There are no settable settings.';
    }
    let prefix = '';
    let prefixExtention = this.isTopLevel_ ? '' : ' for **' + this.fullyQualifiedName_ + '**';
    if (desiredFullyQualifiedName !== this.fullyQualifiedName_) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedName + '. Here are the settings' + prefixExtention + '.\n';
    }
    if (this.childrenType_ === this.categoryTypeIdentifier_) {
      return this.getConfigurationInstructionsBotContentForCategoryChildren_(prefix);
    } else {
      return this.getConfigurationInstructionsBotContentForSettingsChildren_(prefix, channelId, settings, desiredFullyQualifiedName);
    }
  }

  setChildren(children) {
    if (!children || children.length === 0) {
      throwError('Trying to set 0 children on a settings category.', children);
    }
    this.childrenType_ = children[0].type;
    if (!children.every(child => child.type === this.childrenType_)) {
      throwError(`A settings category has children of different type. They should all either be '${this.categoryTypeIdentifier_}' or '${this.settingTypeIdentifier_}'. They cannot be mixed.`, children);
    }
    this.children_ = [];
    for (let child of children) {
      if (!child) {
        throwError('A child is invalid.', children);
      } else if (!child.type || typeof child.type !== typeof '' || (child.type !== this.categoryTypeIdentifier_ && child.type !== this.settingTypeIdentifier_)) {
        throwError(`A child has an invalid type. It should be a string, either '${this.categoryTypeIdentifier_}'' or '${this.settingTypeIdentifier_}'.`, children);
      } else if (this.children_.find(otherChild => otherChild.userFacingName === child.userFacingName)) {
        throwError('Two children have the same userFacingName.', children);
      } else if (child.databaseFacingName && this.children_.find(otherChild => otherChild.databaseFacingName === child.databaseFacingName)) {
        throwError('Two children have the same databaseFacingName.', children);
      } else if (child.type === this.categoryTypeIdentifier_) {
        let childCategory = new SettingsCategory(child, this.fullyQualifiedName_, this.categoryTypeIdentifier_, this.settingTypeIdentifier_, this.config_);
        this.children_.push(childCategory);
        childCategory.setChildren(child.children);
      } else {
        this.children_.push(new Setting(child, this.fullyQualifiedName_, this.settingsCategorySeparator_, this.config_.colorForSettingsSystemEmbeds, this.settingsCommand_));
      }
    }
  }

  getConfigurationInstructionsBotContentForCategoryChildren_(prefix) {
    let subCategories = this.children_.map(child => child.getFullyQualifiedUserFacingName());
    let subCategoryListString = subCategories.map(subCategory => '  ' + subCategory).join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings categories';
    } else {
      titleString = 'Sub-categories under ' + this.fullyQualifiedName_;
    }
    return prefix + `
\`\`\`md
# ${titleString}

${subCategoryListString}

# Say '${this.settingsCommand_} [category name]' to view and set that category's settings.
    Example: ${this.settingsCommand_} ${subCategories[0]}
\`\`\`
`;
  }

  getConfigurationInstructionsBotContentForSettingsChildren_(prefix, channelId, settings, desiredFullyQualifiedName) {
    let exampleSetting = this.children_[0].getFullyQualifiedUserFacingName();
    let exampleValue = this.children_[0].getUserFacingExampleValues()[0];
    let settingsListString = this.children_
      .map(child => '  ' + child.getFullyQualifiedUserFacingName() + ' -> ' + child.getCurrentUserFacingValue(channelId, settings)).join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings';
    } else {
      titleString = `Settings under '${this.fullyQualifiedName_}' and their current values in this channel.`;
    }
    return prefix + `
\`\`\`md
# ${titleString}

${settingsListString}

# Say '${this.settingsCommand_} [setting] [value]' to set a setting. Next, you will choose which channels to apply the setting to.
    Example: ${this.settingsCommand_} ${exampleSetting} ${exampleValue}
# Say '${this.settingsCommand_} [setting]' to get more information about that setting, including allowed values.
    Example: ${this.settingsCommand_} ${exampleSetting}
\`\`\`
`;
  }
}

module.exports = SettingsCategory;
