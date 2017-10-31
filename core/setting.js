const assert = require('assert');

const STRING_VALUE_TYPE = 'STRING';
const INTEGER_VALUE_TYPE = 'INTEGER';
const FLOAT_VALUE_TYPE = 'FLOAT';
const BOOLEAN_VALUE_TYPE = 'BOOLEAN';
const prettyPrintForValueType = {};
prettyPrintForValueType[STRING_VALUE_TYPE] = 'Text';
prettyPrintForValueType[INTEGER_VALUE_TYPE] = 'Whole number';
prettyPrintForValueType[FLOAT_VALUE_TYPE] = 'Number';
prettyPrintForValueType[BOOLEAN_VALUE_TYPE] = 'true or false';

class Range() {
  constructor(lower, upper) {
    this.lower_ = lower;
    this.upper_ = upper;
  }

  getLower() {
    return this.lower_;
  }

  getUpper() {
    return this.upper_;
  }

  isWithinRange(value) {
    return value >= this.lower_ && value <= this.upper_;
  }
}

function throwError(baseString, failedBlob) {
  throw new Error(baseString + ' Failed blob: \n' + JSON.stringify(failedBlob, null, 2));
}

class Setting {
  constructor(settingsBlob, qualificationWithoutName, settingsCategorySeparator) {
    if (!settingsBlob.description || typeof settingsBlob.description !== typeof '') {
      throwError('Setting needs a description. It either doesn\'t have one, or it has one that isn\'t a string', settingsBlob);
    } else if (Object.keys(prettyPrintForValueType).indexOf(settingsBlob.valueType) === -1) {
      throwError('Setting needs a value type. it either doesn\'t have one, or it has one that\'s invalid. It must be one of: ' + Object.keys(prettyPrintForValueType).join(', '), settingsBlob);
    } else if (!settingsBlob.name || typeof settingsBlob.name !== typeof '') {
      throwError('Setting does not have a name, or it is invalid. It must be a non-empty string.', settingsBlob);
    } else if (settingsBlob.name.indexOf(settingsCategorySeparator) !== -1) {
      throwError('A setting has an invalid name. It must not contain a ' + settingsCategorySeparator, settingsBlob);
    } else if (settingsBlob.name.indexOf(' ') !== -1) {
      throwError('A setting has an invalid name. It must not be a space.', settingsBlob);
    } else if (settingsBlob.defaultDatabaseFacingValue === undefined) {
      throwError('A setting has no defaultDatabaseFacingValue value. It must have one.', settingsBlob);
    }
    this.description_ = settingsBlob.description;
    this.valueType_ = settingsBlob.valueType;
    this.customAllowedValuesString_ = settingsBlob.customAllowedValuesString;
    this.customValidateDatabaseFacingValueFunction_ = settingsBlob.customValidateDatabaseFacingValueFunction;
    this.name_ = settingsBlob.name;
    this.allowedValues = settingsBlob.allowedValues;
    this.fullyQualifiedName_ = qualificationWithoutName + '.' + this.name_;
    this.defaultDatabaseFacingValue_ = defaultDatabaseFacingValue;
    this.customConvertFromDatabaseToUserFacingValue_ = settingsBlob.customConvertFromDatabaseToUserFacingValue;
    this.customConvertFromUserToDatabaseFacingValue_ = settingsBlob.customConvertFromUserToDatabaseFacingValue;
    if (this.allowedValues.indexOf('Range(') === 0) {
      try {
        this.allowedValues = eval('new ' + this.allowedValues);
      } catch (err) { }
      if (!this.allowedValues) {
        throwError('Tried to parse allowedValues as a Range, but failed.', settingsBlob.allowedValues);
      }
      if (this.valueType_ === STRING_VALUE_TYPE) {
        throwError('The allowed values are a range for that setting, but the value type is STRING. If the allowed values are a range, the value type must be INTEGER or FLOAT');
      }
      if (this.valueType_ === BOOLEAN_VALUE_TYPE) {
        throwError('The allowed values are a range for that setting, but the value type is BOOLEAN. If the allowed values are a range, the value type must be INTEGER or FLOAT');
      }
    }
  }

  getCurrentDatabaseFacingValue(settings, channelId) {
    let channelSetting = settings.channelSettings[channelId][this.fullyQualifiedName_];
    if (channelSetting) {
      return channelSetting;
    }
    let serverSetting = settings.serverSettings[this.fullyQualifiedName_];
    if (serverSetting) {
      return serverSetting;
    }
    return this.defaultDatabaseFacingValue_;
  }

  getCurrentUserFacingValue(bot, msg, settings) {
    return this.convertDatabaseFacingValueToUserFacingValue_(bot, msg, this.getCurrentDatabaseFacingValue(settings, msg.channel.id));
  }

  getDefaultUserFacingValue(bot, msg) {
    return this.convertDatabaseFacingValueToUserFacingValue_(bot, msg, this.defaultDatabaseFacingValue_);
  }

  getFullyQualifiedName() {
    return this.fullyQualifiedName_;
  }

  getConfigurationInstructionsString(bot, msg, settings, desiredFullyQualifiedName) {
    let prefix = '';
    if (this.fullyQualifiedName_ !== desiredFullyQualifiedName) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedName + '. Here are the settings for ' + this.fullyQualifiedName_ + '.\n\n';
    }

    return prefix +  ```
\`\`\`glsl
# ${this.fullyQualifiedName_}

${this.description_}

Value type:
  ${this.prettyPrintForValueType[this.valueType_]}

Allowed values:
  ${this.getAllowedValueString_()}

Current value:
  ${this.getCurrentUserFacingValue(bot, msg, settings)}
\`\`\`
```;
  }

  setNewValueFromUserFacingString(bot, msg, currentSettings, newValue, serverWide) {
    let databaseFacingValue = this.convertUserFacingValueToDatabaseFacingValue_(newValue);
    let validationResult = validateNewDatabaseFacingValue(bot, msg, databaseFacingValue);
    if (!validationResult) {
      return createValidationFailureString_();
    }

    if (serverWide) {
      currentSettings.serverSettings[this.fullyQualifiedName_] = databaseFacingValue;
    } else {
      currentSettings.channelSettings[msg.channel.id][this.fullyQualifiedName_] = databaseFacingValue;
    }
    return true;
  }

  convertUserFacingValueToDatabaseFacingValue_(value) {
    if (this.customConvertFromUserToDatabaseFacingValue_) {
      return this.customConvertFromUserFacingToDatabaseFacingValue_(value);
    } else if (this.valueType_ === INTEGER_VALUE_TYPE) {
      return parseInt(value);
    } else if (this.valueType_ === FLOAT_VALUE_TYPE) {
      return parseFloat(value);
    } else if (this.valueType_ === BOOLEAN_VALUE_TYPE) {
      return value === 'true';
    }
    return value.toString();
  }

  validateNewDatabaseFacingValue(bot, msg, value) {
    if (this.customValidateDatabaseFacingValueFunction_) {
      let result = this.customValidateDatabaseFacingValueFunction_(bot, msg, value);
      if (result) {
        return result;
      }
    }
    if (!this.allowedValues) {
      return true;
    }
    if (Array.isArray(this.allowedValues) && this.validateDatabaseFacingValueIsInArray_(value)) {
      return true;
    }
    if (this.allowedValues instanceof Range && this.validateDatabaseFacingValueIsWithinRange_(value)) {
      return true;
    }
    if (this.valueType_ === BOOLEAN_VALUE_TYPE && this.validatDatabaseFacingValueIsBoolean_(value)) {
      return true;
    }
    return false;
  }

  validateDatabaseFacingValueIsBoolean_(value) {
    return typeof value === typeof true;
  }

  validateDatabaseFacingValueIsWithinRange_(value) {
    return this.allowedValues.isWithinRange(value);
  }

  validateDatabaseFacingValueIsInArray_(value) {
    return this.allowedValues.indexOf(value) !== -1;
  }

  convertDatabaseFacingValueToUserFacingValue_(bot, msg, value) {
    if (this.customConvertFromDatabaseToUserFacingValue_) {
      return this.customConvertFromDatabaseToUserFacingValue_(bot, msg, value);
    }
    return value.toString();
  }

  getAllowedValueString_() {
    if (this.customAllowedValuesString_) {
      return this.customAllowedValuesString_;
    }
    let prettyPrintedValueType = this.prettyPrintForValueType[this.valueType_];
    if (!this.allowedValues) {
      return 'Any ' + prettyPrintedValueType.toLowerCase();
    }
    if (this.allowedValues instanceof Range) {
      return prettyPrintedValueType + ' between ${this.allowedValues.getLower()} and ${this.allowedValues.getUpper()}';
    }
    if (Array.isArray(this.allowedValues)) {
      return 'One of: ' + this.allowedValues.join(', ');
    }
  }

  createValidationFailureString_() {
    return 'Could not apply that setting, because it is invalid. It must be: ' + this.getAllowedValueString_().toLowerCase();
  }
}

module.exports = Setting;
