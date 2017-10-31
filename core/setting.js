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
  constructor(settingsBlob) {
    if (!settingsBlob.description || typeof settingsBlob.description !== typeof '') {
      throwError('Setting needs a description. It either doesn\'t have one, or it has one that isn\'t a string', settingsBlob);
    }
    if (Object.keys(prettyPrintForValueType).indexOf(settingsBlob.valueType) === -1) {
      throwError('Setting needs a value type. it either doesn\'t have one, or it has one that\'s invalid. It must be one of: ' + Object.keys(prettyPrintForValueType).join(', '), settingsBlob);
    }
    this.description_ = settingsBlob.description;
    this.valueType_ = settingsBlob.valueType;
    this.customAllowedValuesString_ = settingsBlob.customAllowedValuesString;
    this.customValidationFunction_ = settingsBlob.customValidationFunction;
    this.allowedValues = settingsBlob.allowedValues;
    if (this.allowedValues.indexOf('Range(') === 0) {
      try {
        this.allowedValues = eval(this.allowedValues);
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

  getConfigurationInstructionsStringForQualifierChain(wholeQualifierChain, currentQualifierChain, currentSettings) {
    return ```
\`\`\`glsl
# ${wholeQualifierChain}

${this.description_}

Value type:
  ${this.prettyPrintForValueType[this.valueType_]}

Allowed values:
  ${getAllowedValueString_()}

\`\`\`
```;
  }

  validateNewSetting(setting) {
    if (this.customValidationFunction_ && this.customValidationFunction_(setting)) {
      return true;
    }
    if (!this.allowedValues) {
      return true;
    }
    if (this.valueType_ === STRING_VALUE_TYPE) {
      return true;
    }
    if (this.allowedValues instanceof Range && this.validateNewSettingIsWithinRange_(setting)) {
      return true;
    }
    if (this.valueType_ === BOOLEAN_VALUE_TYPE && this.validateNewSettingIsBoolean_(setting)) {
      return true;
    }
    if (Array.isArray(this.allowedValues) && this.validateNewSettingIsInArray_(setting)) {
      return true;
    }
    return createValidationFailureString_();
  }

  createValidationFailureString_() {
    return 'Could not apply that setting, because it is invalid. It must be: ' + this.getAllowedValueString_().toLowerCase();
  }

  validateNewSettingIsBoolean_(setting) {
    let lowerCaseSetting = setting.toLowerCase();
    return lowerCaseSetting === 'true' || lowerCaseSetting === 'false';
  }

  validateNewSettingIsWithinRange_(setting) {
    let number = parseFloat(setting);
    if (this.valueType_ === INTEGER_VALUE_TYPE) {
      number = Math.floor(number);
    }

    return this.allowedValues.isWithinRange(number);
  }

  validateNewSettingIsInArray_(setting) {
    return this.allowedValues.indexOf(setting) !== -1;
  }

  getUserFacingSettingValueString(setting) {
    if (this.getUserFacingSettingValueString_) {
      return this.getUserFacingSettingValueString_(setting);
    }
    return setting;
  }

  getDatabaseSettingValueString(setting) {
    if (this.getDatabaseSettingValueString_) {
      return this.getDatabaseSettingValueString_(setting);
    }
    if (this.valueType_ === INTEGER_VALUE_TYPE) {
      return parseInt(setting);
    }
    if (this.valueType_ === FLOAT_VALUE_TYPE) {
      return parseFloat(setting);
    }
    if (this.valueType_ === BOOLEAN_VALUE_TYPE) {
      return setting.toLowerCase() === 'true';
    }
    return setting;
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
}

module.exports = Setting;
