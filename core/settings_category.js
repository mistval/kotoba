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
    assert(children.every(child => typeof child === this.childrenType), 'The children are of different type. They should either all be Settings or they should all be SettingsCategorys');
    assert(this.childrenType === typeof SettingsCategory || this.childrenType === typeof Setting, 'The children are of the wrong type. They should all be Settings or SettingsCategorys');
  }

  getName() {
    return this.name_;
  }

  getStringForBot(qualifier, currentSettings) {
    if (this.childrenType === typeof SettingsCategory) {
      return this.getStringForBotForCategoryChildren_(qualifier);
    } else {
      return this.getStringForBotForSettingChildren_(qualifier, currentSettings);
    }
  }

  getStringForBotForCategoryChildren_(qualifier) {
    let subCategories = this.children.map(child => qualifier + child.getName());
    let subCategoryListString = subCategories.join('\n');
    return ```
The following categories of settings are available.

\`\`\`
${subCategoryListString}
\`\`\`

Say ]settings [category name] to view and set that category's settings. For example: ]settings ${subCategories[0]}
```;
  }

  getStringForBotForSettingChildren_(qualifier, currentSettings) {
    let settingsListString = this.children_.map(child => qualifier + child.getName() + ': ' + child.getCurrentUserFacingValue(currentSettings));
    return ```
The following settings are available in that category.

\`\`\`

```;
  }
}
