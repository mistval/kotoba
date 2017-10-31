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
  constructor(settingsBlob, isTopLevel) {
    this.isTopLevel_ = isTopLevel;
    this.name_ = settingsBlob.name || '';
    if (this.name_.indexOf('.') !== -1) {
      throwError('A settings category has an invalid name. It must not contain a period.');
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
        throwError(```A child has an invalid type. It should be a string, either '${CATEGORY_IDENTIFIER}'' or '${SETTING_IDENTIFIER}'.```, child);
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

  getConfigurationInstructionsStringForQualifierChain(wholeQualifierChain, currentQualifierChain, currentSettings) {
    if (currentQualifierChain === this.getName()) {
      return this.getConfigurationInstructionsStringAtThisLevel_(wholeQualifierChain);
    }
    let child = this.getChildForQualifierChain(currentQualifierChain);
    if (child) {
      return child.getConfigurationInstructionsStringForQualifierChain(wholeQualifierChain, this.getQualifierChainForChild(currentQualifierChain), currentSettings);
    }
    let qualifierChainSuccessfullyResolvedPart = wholeQualifierChain.replace('.' + currentQualifierChain, '');
    let configurationInstructionsAtThisLevel = this.getConfigurationInstructionsStringAtThisLevel_(qualifierChainSuccessfullyResolvedPart);
    return ```
Couldn't find that setting. Here are the settings for ${qualifierChainSuccessfullyResolvedPart}

${configurationInstructionsAtThisLevel}
```;
  }

  getChildForQualifierChain(currentQualifierChain) {
    let childName = currentQualifierChain.split('.')[1];
    if (childName) {
      for (let child of this.children_) {
        if (child.getName() === childName) {
          return child;
        }
      }
    }
    return undefined;
  }

  getQualifierChainForChild(currentQualifierChain) {
    if (this.isTopLevel_) {
      return currentQualifierChain;
    } else {
      return currentQualifierChain.replace(this.getName() + '.', '');
    }
  }

  getConfigurationInstructionsStringAtThisLevel_(qualifierChainResolvedPart, currentSettings) {
    if (this.childrenType === typeof SettingsCategory) {
      return this.getConfigurationInstructionsStringAtThisLevelForCategoryChildren_(qualifierChainResolvedPart);
    } else {
      return this.getConfigurationInstructionsStringAtThisLevelForSettingsChildren_(qualifierChainResolvedPart, currentSettings);
    }
  }

  getConfigurationInstructionsStringAtThisLevelForCategoryChildren_(qualifierChainResolvedPart) {
    let subCategories = this.children.map(child => '  ' + qualifierChainResolvedPart + '.' + child.getName());
    let subCategoryListString = subCategories.join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings categories';
    } else {
      titleString = 'Sub-categories under ' + qualifierChainSuccessfullyResolvedPart;
    }
    return ```
\`\`\`glsl
# ${titleString}

${subCategoryListString}

Say ']settings [category name]' to view and set that category's settings. For example: ]settings ${subCategories[0]}
\`\`\`
```;
  }

  getConfigurationInstructionsStringAtThisLevelForSettingsChildren_(qualifierChainResolvedPart, currentSettings) {
    let exampleSetting = this.children_[0].getName();
    let exampleValue = this.children_[0].getExampleValues()[0];
    let settingsListString = this.children_
      .map(child => '  ' + qualifierChainResolvedPart + child.getName() + ': ' + child.getCurrentUserFacingValue(currentSettings)).join('\n');
    let titleString;
    if (this.isTopLevel_) {
      titleString = 'Settings';
    } else {
      titleString = 'Settings under ' + qualifierChainSuccessfullyResolvedPart;
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
