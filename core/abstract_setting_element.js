'use strict'
const requiredMethods = [
  'getChildForFullyQualifiedUserFacingName',
  'getFullyQualifiedUserFacingName',
  'getConfigurationInstructionsBotContent',
  'setNewValueFromUserFacingString'
];

class AbstractSettingElement {
  constructor() {
    for (let requiredMethod of requiredMethods) {
      if (typeof this[requiredMethod] !== 'function') {
        throw new Error('AbstractSettingElement child class is missing abstract method: ' + requiredMethod + '()');
      }
    }
  }
}

module.exports = AbstractSettingElement;