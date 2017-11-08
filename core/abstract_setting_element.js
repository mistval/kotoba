'use strict'
const requiredMethods = [
  'getChildForFullyQualifiedUserFacingName',
  'getFullyQualifiedUserFacingName',
  'getConfigurationInstructionsBotContent',
  'setNewValueFromUserFacingString'
];

/**
* Verifies that an element in the settings hierarchy implements the correct methods.
*/
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
