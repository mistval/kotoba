'use strict'
const reload = require('require-reload')(require);
const Setting = reload('setting.js')
const assert = require('assert');

class SettingsCategory {
  constructor(name, children) {
    this.children_ = children;
    this.name_ = name;
    assert(children && children.length > 0, 'Children argument is undefined empty. It should be an array with at least one element.');
    this.childrenType_ = typeof children[0];
    assert(typeof name === typeof '' && name, 'The name argument is not a string or is empty. It should be a string.');
    assert(name.indexOf('.') === -1, 'The name argument should not contain a period');
    assert(children.every(child => typeof child === this.childrenType), 'The children are of different type. They should either all be Settings or they should all be SettingsCategorys');
    assert(this.childrenType === typeof SettingsCategory || this.childrenType === typeof Setting, 'The children are of the wrong type. They should all be Settings or SettingsCategorys');
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
    return currentQualifierChain.replace(this.getName() + '.', '');
  }

  getConfigurationInstructionsStringAtThisLevel_(qualifierChainResolvedPart, currentSettings) {
    if (this.childrenType === typeof SettingsCategory) {
      return this.getConfigurationInstructionsStringAtThisLevelForCategoryChildren_(qualifierChainResolvedPart);
    } else {
      return this.getConfigurationInstructionsStringAtThisLevelForSettingsChildren_(qualifierChainResolvedPart, currentSettings);
    }
  }

  getConfigurationInstructionsStringAtThisLevelForCategoryChildren_(qualifierChainResolvedPart) {
    let subCategories = this.children.map(child => qualifierChainResolvedPart + '.' + child.getName());
    let subCategoryListString = subCategories.join('\n');
    return ```
Sub-categories under ${qualifierChainResolvedPart}:

\`\`\`
${subCategoryListString}
\`\`\`

Say ']settings [category name]' to view and set that category's settings. For example: ]settings ${subCategories[0]}
```;
  }

  getConfigurationInstructionsStringAtThisLevelForSettingsChildren_(qualifierChainResolvedPart, currentSettings) {
    let exampleSetting = this.children_[0].getName();
    let exampleValue = this.children_[0].getExampleValues()[0];
    let settingsListString = this.children_
      .map(child => qualifierChainResolvedPart + child.getName() + ': ' + child.getCurrentUserFacingValue(currentSettings)).join('\n');
    return ```
Settings available under ${qualifierChainResolvedPart}:

\`\`\`
${settingsListString}
\`\`\`

Say ']settings [setting] [value]' to set a setting. For example: ]settings ${exampleSetting} ${exampleValue}
Say ']settings [setting]' to get more information about that setting. For example: ]setting ${exampleSetting}
```;
  }
}
