'use strict'
const reload = require('require-reload')(require);
const Setting = reload('./setting.js')
const assert = require('assert');

function throwError(baseString, failedBlob) {
  throw new Error(baseString + ' Failed blob: \n' + JSON.stringify(failedBlob, null, 2));
}

class SettingsCategory {
  constructor(settingsBlob, qualificationWithoutName, categoryIdentifier, settingIdentifier, config) {
    this.name_ = settingsBlob.name || '';
    this.config_ = config;
    this.settingIdentifier_ = settingIdentifier;
    this.settingsCategorySeparator_ = config.settingsCategorySeparator;
    this.fullyQualifiedName_ = qualificationWithoutName ? qualificationWithoutName + this.settingsCategorySeparator_ + this.name_ : this.name_;
    this.isTopLevel_ = !this.fullyQualifiedName_;
    this.categoryIdentifier_ = categoryIdentifier;
    this.children_ = [];
    this.type = categoryIdentifier;
    this.settingsCommand_ = config.serverSettingsCommandAliases[0];
  }

  static createRootCategory(categoryIdentifier, settingIdentifier, config) {
    let settingsBlob = {
      name: '',
    };
    return new SettingsCategory(settingsBlob, '', categoryIdentifier, settingIdentifier, config);
  }

  setChildren(children) {
    if (!children || children.length === 0) {
      return;
    }
    this.childrenType_ = children[0].type;
    if (!children.every(child => child.type === this.childrenType_)) {
      throwError(`A settings category has children of different type. They should all either be '${this.categoryIdentifier_}'' or '${this.settingIdentifier_}'. They cannot be mixed.`, children);
    }
    this.children_ = [];
    for (let child of children) {
      if (!child) {
        throwError('A child is invalid.', children);
      } else if (!child.type || typeof child.type !== typeof '' || (child.type !== this.categoryIdentifier_ && child.type !== this.settingIdentifier_)) {
        throwError(`A child has an invalid type. It should be a string, either '${this.categoryIdentifier_}'' or '${this.settingIdentifier_}'.`, children);
      } else if (this.children_.find(otherChild => otherChild.userFacingName === child.userFacingName)) {
        throwError('Two children have the same userFacingName.', children);
      } else if (this.children_.find(otherChild => otherChild.databaseFacingName === child.databaseFacingName)) {
        throwError('Two children have the same databaseFacingName.', children);
      } else if (child.type === this.categoryIdentifier_) {
        let childCategory = new SettingsCategory(child, this.fullyQualifiedName_, this.categoryIdentifier_, this.settingIdentifier_, this.config_)
        this.children_.push(childCategory);
        childCategory.setChildren(child.children);
      } else {
        this.children_.push(new Setting(child, this.fullyQualifiedName_, this.settingsCategorySeparator_, this.config_.colorForSettingsSystemEmbeds, this.settingsCommand_));
      }
    }
  }

  setNewValueFromUserFacingString(bot, msg, currentSettings, newValue, serverWide) {
    // This is a category, not a setting. Return the category information to print.
    return getConfigurationInstructionsString(bot, msg, currentSettings, this.fullyQualifiedName_);
  }

  getChildForRelativeQualifiedUserFacingName(relativeQualifiedName) {
    let child = this.getChildForRelativeQualifiedUserFacingNameHelper_(relativeQualifiedName);
    if (child) {
      return child.getChildForRelativeQualifiedUserFacingName(this.getRelativeQualifiedUserFacingNameForChild_(relativeQualifiedName));
    } else {
      return this;
    }
  }

  getConfigurationInstructionsString(bot, msg, settings, desiredFullyQualifiedName) {
    debugger;
    let prefix = '';
    let prefixExtention = this.fullyQualifiedName_ ? ' for ' + this.fullyQualifiedName_ : '';
    if (desiredFullyQualifiedName !== this.fullyQualifiedName_) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedName + '. Here are the settings' + prefixExtention + '.\n';
    }
    if (this.childrenType_ === this.categoryIdentifier_) {
      return this.getConfigurationInstructionsStringForCategoryChildren_(prefix);
    } else {
      return this.getConfigurationInstructionsStringForSettingsChildren_(prefix, bot, msg, settings, desiredFullyQualifiedName);
    }
  }

  getFullyQualifiedUserFacingName() {
    return this.fullyQualifiedName_;
  }

  getUnqualifiedUserFacingName() {
    return this.name_;
  }

  getChildForRelativeQualifiedUserFacingNameHelper_(relativeQualifiedName) {
    let childName = relativeQualifiedName.split(this.settingsCategorySeparator_)[0];
    if (childName) {
      for (let child of this.children_) {
        if (child.getUnqualifiedUserFacingName() === childName) {
          return child;
        }
      }
    }
  }

  getRelativeQualifiedUserFacingNameForChild_(relativeQualifiedName) {
    return relativeQualifiedName.split(this.settingsCategorySeparator_).slice(1).join(this.settingsCategorySeparator_);
  }

  getConfigurationInstructionsStringForCategoryChildren_(prefix) {
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

  getConfigurationInstructionsStringForSettingsChildren_(prefix, bot, msg, settings, desiredFullyQualifiedName) {
    let exampleSetting = this.children_[0].getFullyQualifiedUserFacingName();
    let exampleValue = this.children_[0].getUserFacingExampleValues(bot, msg)[0];
    let settingsListString = this.children_
      .map(child => '  ' + child.getFullyQualifiedUserFacingName() + ' -> ' + child.getCurrentUserFacingValue(bot, msg, settings)).join('\n');
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
