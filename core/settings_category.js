'use strict'
const reload = require('require-reload')(require);
const Setting = reload('setting.js')
const assert = require('assert');

const CATEGORY_IDENTIFIER = 'CATEGORY';
const SETTING_IDENTIFIER = 'SETTING';

function throwError(baseString, failedBlob) {
  throw new Error(baseString + ' Failed blob: \n' + JSON.stringify(failedBlob, null, 2));
}

class SettingsCategory {
  constructor(settingsBlob, qualificationWithoutName) {
    this.name_ = settingsBlob.name || '';
    this.fullyQualifiedName_ = qualificationWithoutName ? qualificationWithoutName + '.' + this.name_ : '';
    this.isTopLevel_ = !this.fullyQualifiedName_;
    if (this.name_.indexOf('.') !== -1) {
      throwError('A settings category has an invalid name. It must not contain a period.', settingsBlob);
    }
    if (!isTopLevel && !this.name_) {
      throwError('A settings category has an invalid or nonexistent name property. It should be a non-empty string.', settingsBlob);
    }
    if (!blob.children || blob.children.length < 1) {
      throwError('A settings category has an empty or non-existent children children proprty. It should be an array of settings categories or settings', settingsBlob);
    }
    this.children_ = [];
    for (let child of blob.children) {
      if (!child) {
        throwError('A child is invalid.', settingsBlob);
      }
      if (!child.type || typeof child.type !== typeof '' || (child.type !== CATEGORY_IDENTIFIER && child.type !== SETTING_IDENTIFIER)) {
        throwError(```A child has an invalid type. It should be a string, either '${CATEGORY_IDENTIFIER}'' or '${SETTING_IDENTIFIER}'.```, settingsBlob);
      }
      if (this.children_.find(otherChild => otherChild.getName() === child.getName())) {
        throwError('Two children have the same name.', settingsBlob);
      }
      if (child.type === CATEGORY_IDENTIFIER) {
        this.children_.push(new SettingsCategory(child, false));
      } else {
        this.children_.push(new Setting(child));
      }
    }

    this.childrenType_ = typeof this.children_[0];
    if (!children.every(child => typeof child === this.childrenType)) {
      throwError(```A settings category has children of different type. They should all either be '${CATEGORY_IDENTIFIER}'' or '${SETTING_IDENTIFIER}'. They cannot be mixed.```, settingsBlob);
    }
  }

  getName() {
    return this.name_;
  }

  getConfigurationInstructionsStringForQualifierChain(fullyQualifiedName, relativeQualifiedName, currentSettings) {
    if (fullyQualifiedName === this.fullyQualifiedName_) {
      return this.getConfigurationInstructionsStringAtThisLevel_();
    }
    let child = this.getChildForRelativeQualifiedName_(relativeQualifiedName);
    if (child) {
      return child.getConfigurationInstructionsStringForQualifierChain(fullyQualifiedName, this.getRelativeQualifiedNameForChild_(relativeQualifiedName), currentSettings);
    }
    let configurationInstructionsAtThisLevel = this.getConfigurationInstructionsStringAtThisLevel_(currentSettings);
    return ```
Couldn't find that setting. Here are the settings for ${this.fullyQualifiedName_}

${configurationInstructionsAtThisLevel}
```;
  }

  getChildForRelativeQualifiedName_(relativeQualifiedName) {
    let childName = relativeQualifiedName.split('.')[0];
    if (childName) {
      for (let child of this.children_) {
        if (child.getName() === childName) {
          return child;
        }
      }
    }
  }

  getRelativeQualifiedNameForChild_(relativeQualifiedName) {
    return relativeQualifiedName.split('.').slice(1).join('.');
  }

  getConfigurationInstructionsStringAtThisLevel_(currentSettings) {
    if (this.childrenType === typeof SettingsCategory) {
      return this.getConfigurationInstructionsStringAtThisLevelForCategoryChildren_();
    } else {
      return this.getConfigurationInstructionsStringAtThisLevelForSettingsChildren_(currentSettings);
    }
  }

  getConfigurationInstructionsStringAtThisLevelForCategoryChildren_() {
    let subCategories = this.children.map(child => '  ' + this.fullyQualifiedName_ + '.' + child.getName());
    let subCategoryListString = subCategories.join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings categories';
    } else {
      titleString = 'Sub-categories under ' + this.fullyQualifiedName;
    }
    return ```
\`\`\`glsl
# ${titleString}

${subCategoryListString}

Say ']settings [category name]' to view and set that category's settings. For example: ]settings ${subCategories[0]}
\`\`\`
```;
  }

  getConfigurationInstructionsStringAtThisLevelForSettingsChildren_(currentSettings) {
    let exampleSetting = this.children_[0].getName();
    let exampleValue = this.children_[0].getExampleValues()[0];
    let settingsListString = this.children_
      .map(child => '  ' + this.fullyQualifiedName + '.' + child.getName() + ': ' + child.getCurrentUserFacingValue(currentSettings)).join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings';
    } else {
      titleString = 'Settings under ' + this.fullyQualifiedName;
    }
    return ```
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
