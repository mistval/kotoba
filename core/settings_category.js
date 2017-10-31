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
    this.settingIdentifier_ = settingIdentifier;
    this.settingsCategorySeparator_ = config.settingsCategorySeparator;
    this.fullyQualifiedName_ = qualificationWithoutName ? qualificationWithoutName + this.settingsCategorySeparator_ + this.name_ : '';
    this.isTopLevel_ = !this.fullyQualifiedName_;
    this.categoryIdentifier_ = categoryIdentifier;
    this.children_ = [];
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
    this.children_ = [];
    for (let child of children) {
      if (!child) {
        throwError('A child is invalid.', settingsBlob);
      }
      if (!child.type || typeof child.type !== typeof '' || (child.type !== this.categoryIdentifier_ && child.type !== this.settingIdentifier_)) {
        throwError(```A child has an invalid type. It should be a string, either '${categoryIdentifier}'' or '${this.settingIdentifier_}'.```, settingsBlob);
      }
      if (this.children_.find(otherChild => otherChild.getName() === child.getName())) {
        throwError('Two children have the same name.', settingsBlob);
      }
      if (child.type === this.categoryIdentifier_) {
        let childCategory = new SettingsCategory(child, this.fullyQualifiedName_, categoryIdentifier, this.settingIdentifier_, config)
        this.children_.push(childCategory);
        childCategory.setChildren(child.chilren);
      } else {
        this.children_.push(new Setting(child, this.fullyQualifiedName_, this.settingsCategorySeparator_));
      }
    }

    this.childrenType_ = this.children_[0].type;
    if (!children.every(child => child.type === this.childrenType)) {
      throwError(```A settings category has children of different type. They should all either be '${categoryIdentifier}'' or '${this.settingIdentifier_}'. They cannot be mixed.```, settingsBlob);
    }
  }

  setNewValueFromUserFacingString(bot, msg, currentSettings, newValue, serverWide) {
    // This is a category, not a setting. Return the category information to print.
    return getConfigurationInstructionsString(bot, msg, currentSettings, this.fullyQualifiedName_);
  }

  getChildForRelativeQualifiedName(relativeQualifiedName) {
    let child = this.getChildForRelativeQualifiedNameHelper_(relativeQualifiedName);
    if (child) {
      return child.getChildForRelativeQualifiedName(this.getRelativeQualifiedNameForChild_(relativeQualifiedName));
    } else {
      return this;
    }
  }

  getConfigurationInstructionsString(bot, msg, settings, desiredFullyQualifiedName) {
    let prefix = '';
    if (desiredFullyQualifiedName !== this.fullyQualifiedName_) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedName + '. Here are the settings for ' + this.fullyQualifiedName_ + '.\n\n';
    }
    if (this.childrenType === this.categoryIdentifier_) {
      return this.getConfigurationInstructionsStringForCategoryChildren_(prefix);
    } else {
      return this.getConfigurationInstructionsStringForSettingsChildren_(prefix, bot, msg, settings, desiredFullyQualifiedName);
    }
  }

  getFullyQualifiedName() {
    return this.fullyQualifiedName_;
  }

  getChildForRelativeQualifiedNameHelper_(relativeQualifiedName) {
    let childName = relativeQualifiedName.split(this.settingsCategorySeparator_)[0];
    if (childName) {
      for (let child of this.children_) {
        if (child.getName() === childName) {
          return child;
        }
      }
    }
  }

  getRelativeQualifiedNameForChild_(relativeQualifiedName) {
    return relativeQualifiedName.split(this.settingsCategorySeparator_).slice(1).join(this.settingsCategorySeparator_);
  }

  getConfigurationInstructionsStringForCategoryChildren_(prefix) {
    let subCategories = this.children.map(child => '  ' + child.getFullyQualifiedName());
    let subCategoryListString = subCategories.join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings categories';
    } else {
      titleString = 'Sub-categories under ' + this.fullyQualifiedName;
    }
    return prefix + ```
\`\`\`glsl
# ${titleString}

${subCategoryListString}

Say ']settings [category name]' to view and set that category's settings. For example: ]settings ${subCategories[0]}
\`\`\`
```;
  }

  getConfigurationInstructionsStringForSettingsChildren_(prefix, bot, msg, settings, desiredFullyQualifiedName) {
    let exampleSetting = this.children_[0].getFullyQualifiedName();
    let exampleValue = this.children_[0].getUserFacingExampleValue(bot, msg);
    let settingsListString = this.children_
      .map(child => '  ' + this.fullyQualifiedName + this.settingsCategorySeparator_ + child.getFullyQualifiedName() + ': ' + child.getCurrentUserFacingValue(bot, msg, settings)).join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings';
    } else {
      titleString = 'Settings under ' + this.fullyQualifiedName;
    }
    return prefix + ```
\`\`\`glsl
# ${titleString}

${settingsListString}

# Help

# Say ']settings [setting]' to get more information about that setting, including allowed values.
    Example: ]setting ${exampleSetting}
# Say ']settings [setting] [value]' to set a setting in this channel.
    Example: ]settings ${exampleSetting} ${exampleValue}
# Say ']settings [setting] [value] --all' to set a setting server-wide.
    Example: ]settings ${exampleSetting} ${exampleValue} --all
# Say ']settings [setting] [value] #channel1 #channel2 #channelx' to set a setting on specific channels.
    Example: ]settings ${exampleSetting} ${exampleValue} #welcome #general
\`\`\`
```;
  }
}

module.exports = SettingsCategory;
