'use strict'
const reload = require('require-reload')(require);
const assert = require('assert');
const AbstractSettingElement = reload('./abstract_setting_element.js');

const ValueType = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  FLOAT: 'FLOAT',
  BOOLEAN: 'BOOLEAN',
  CUSTOM: 'CUSTOM',
};

const prettyPrintForValueType = {};
prettyPrintForValueType[ValueType.STRING] = 'Text';
prettyPrintForValueType[ValueType.INTEGER] = 'Whole number';
prettyPrintForValueType[ValueType.FLOAT] = 'Number';
prettyPrintForValueType[ValueType.BOOLEAN] = 'True or false';
prettyPrintForValueType[ValueType.CUSTOM] = '';

const arbitraryAllowedValuesForType = {};
arbitraryAllowedValuesForType[ValueType.STRING] = 'Any text';
arbitraryAllowedValuesForType[ValueType.INTEGER] = 'Any whole number';
arbitraryAllowedValuesForType[ValueType.FLOAT] = 'Any number';
arbitraryAllowedValuesForType[ValueType.BOOLEAN] = 'True or false';
arbitraryAllowedValuesForType[ValueType.CUSTOM] = '';


class Range {
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

function extractChannelIdsFromString(str) {
  return str.replace(/<#/g, '').replace(/>/g, '').split(' ');
}

function findChannelsNotInGuild(channelIds, guild) {
  return channelIds.filter(channelId => {
    return !guild.channels.find(guildChannel => guildChannel.id === channelId);
  });
}

function throwError(baseString, failedBlob) {
  throw new Error(baseString + ' Failed blob: \n' + JSON.stringify(failedBlob, null, 2));
}

class ValueTypeStrategy {
  constructor(
    convertUserFacingValueToDatabaseFacingValue,
    convertDatabaseFacingValueToUserFacingValue,
    validateUserFacingValue) {
      this.convertUserFacingValueToDatabaseFacingValue = convertUserFacingValueToDatabaseFacingValue;
      this.convertDatabaseFacingValueToUserFacingValue = convertDatabaseFacingValueToUserFacingValue;
      this.validateUserFacingValue = validateUserFacingValue;
  }
}

let strategyForValueType = {};
strategyForValueType[ValueType.STRING] = new ValueTypeStrategy(
  (bot, msg, value) => value,
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => true
);
strategyForValueType[ValueType.INTEGER] = new ValueTypeStrategy(
  (bot, msg, value) => parseInt(value),
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => typeof parseInt(value) === typeof 1
);
strategyForValueType[ValueType.FLOAT] = new ValueTypeStrategy(
  (bot, msg, value) => parseFloat(value),
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => typeof parseFloat(value) === typeof 1.5
);
strategyForValueType[ValueType.BOOLEAN] =  new ValueTypeStrategy(
  (bot, msg, value) => value.toLowerCase() === 'true',
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => value.toLowerCase() === 'true' || value.toLowerCase() === 'false'
);

function clearValueFromChannelSettings(channelSettings, settingName) {
  if (channelSettings) {
    let keys = Object.keys(channelSettings);
    for (let key of keys) {
      delete channelSettings[key][settingName];
    }
  }
}

const requiredBlobPropertiesForCustomType = [
  'customAllowedValuesDescription',
  'customValidateDatabaseFacingValueFunction',
  'customConvertFromUserToDatabaseFacingValue',
  'customConvertFromDatabaseToUserFacingValue',
  'customUserFacingExampleValues',
  'customValueTypeDescription',
];

function stringIsRangeConstructor(str) {
  return str && str.indexOf('Range(') === 0;
}

function validateSettingsBlob(settingsBlob, settingsCategorySeparator) {
  let hasAllNecessaryPropertiesForCustomType = requiredBlobPropertiesForCustomType.every(property => {
    return property in settingsBlob;
  });
  if (!('valueType' in settingsBlob)) {
    throwError('Setting does not a valueType property. It must be one of ' + Object.keys(prettyPrintForValueType).join(', '), settingsBlob);
  } else if (settingsBlob.valueType === ValueType.CUSTOM && !hasAllNecessaryPropertiesForCustomType) {
    throwError('The valueType is custom, but the setting does not contain the necessary custom properties: ' + requiredBlobPropertiesForCustomType.join(', '), settingsBlob);
  } else if (!settingsBlob.description || typeof settingsBlob.description !== typeof '') {
    throwError('Setting needs a description. It either doesn\'t have one, or it has one that isn\'t a string', settingsBlob);
  } else if (ValueType[settingsBlob.valueType] === undefined) {
    throwError('Setting needs a value type. it either doesn\'t have one, or it has one that\'s invalid. It must be one of: ' + Object.keys(ValueType).join(', '), settingsBlob);
  } else if (!settingsBlob.userFacingName || typeof settingsBlob.userFacingName !== typeof '') {
    throwError('Setting does not have a userFacingName, or it is invalid. It must be a non-empty string.', settingsBlob);
  } else if (settingsBlob.userFacingName.indexOf(settingsCategorySeparator) !== -1) {
    throwError('A setting has an invalid userFacingName. It must not contain a ' + settingsCategorySeparator, settingsBlob);
  } else if (settingsBlob.databaseFacingName && settingsBlob.databaseFacingName.indexOf(settingsCategorySeparator) !== -1) {
    throwError('A setting has an invalid databaseFacingName. It must not contain a ' + settingsCategorySeparator, settingsBlob);
  } else if (!('defaultDatabaseFacingValue' in settingsBlob)) {
    throwError('A setting has no defaultDatabaseFacingValue value. It must have one.', settingsBlob);
  } else if (settingsBlob.allowedDatabaseFacingValues && !stringIsRangeConstructor(settingsBlob.allowedDatabaseFacingValues) && !Array.isArray(settingsBlob.allowedDatabaseFacingValues)) {
    throwError('A setting has and invalid allowedDatabaseFacingValues. It must be an array or a Range(x,y)', settingsBlob);
  } else if (stringIsRangeConstructor(settingsBlob.allowedDatabaseFacingValues) && settingsBlob.valueType !== ValueType.INTEGER && settingsBlob.valueType !== ValueType.FLOAT) {
    throwError('A setting has an allowedDatabaseFacingValues value that looks like a range, but its valueType is neither INTEGER nor FLOAT', settingsBlob);
  }
}

function tryParseAllowedDatabaseFacingValues(allowedDatabaseFacingValues) {
  if (stringIsRangeConstructor(allowedDatabaseFacingValues)) {
    try {
      return eval('new ' + allowedDatabaseFacingValues);
    } catch (err) {
      throwError('Tried to parse allowedValues as a Range, but failed.', settingsBlob);
    }
  }
  return allowedDatabaseFacingValues;
}

class Setting extends AbstractSettingElement {
  constructor(settingsBlob, qualificationWithoutName, settingsCategorySeparator, colorForEmbeds, serverSettingsCommand) {
    super();
    validateSettingsBlob(settingsBlob, settingsCategorySeparator);
    this.colorForEmbeds_ = colorForEmbeds;
    this.serverSettingsCommand_ = serverSettingsCommand;
    this.customValueTypeDescription_ = settingsBlob.customValueTypeDescription;
    this.isSetting = true;
    this.description_ = settingsBlob.description;
    this.valueType_ = settingsBlob.valueType;
    this.customAllowedValuesString_ = settingsBlob.customAllowedValuesDescription;;
    this.userFacingName_ = settingsBlob.userFacingName;
    this.allowedDatabaseFacingValues_ = settingsBlob.allowedDatabaseFacingValues;
    this.defaultDatabaseFacingValue_ = settingsBlob.defaultDatabaseFacingValue;
    this.customUserFacingExampleValues_ = settingsBlob.customUserFacingExampleValues;
    this.databaseFacingName_ = settingsBlob.databaseFacingName || this.userFacingName_;
    this.fullyQualifiedUserFacingName_ = qualificationWithoutName + settingsCategorySeparator + this.userFacingName_;
    this.fullyQualifiedDatabaseFacingName_ = qualificationWithoutName + settingsCategorySeparator + this.databaseFacingName_;
    this.allowedDatabaseFacingValues_ = tryParseAllowedDatabaseFacingValues(settingsBlob.allowedDatabaseFacingValues);

    if (this.valueType_ === ValueType.CUSTOM) {
      this.valueTypeStrategy_ = new ValueTypeStrategy(
        settingsBlob.customConvertFromUserToDatabaseFacingValue,
        settingsBlob.customConvertFromDatabaseToUserFacingValue,
        settingsBlob.customValidateUserFacingValue);
    } else {
      this.valueTypeStrategy_ = strategyForValueType[this.valueType_];
    }
  }

  getChildForRelativeQualifiedUserFacingName(relativeQualifiedName) {
    return this;
  }

  getUnqualifiedUserFacingName() {
    return this.userFacingName_;
  }

  getFullyQualifiedUserFacingName() {
    return this.fullyQualifiedUserFacingName_;
  }

  getCurrentDatabaseFacingValue(settings, channelId) {
    let settingsForChannel = settings.channelSettings[channelId];
    if (settingsForChannel) {
      let setting = settings.channelSettings[channelId][this.fullyQualifiedDatabaseFacingName_];
      if (setting !== undefined) {
        return setting;
      }
    }
    let serverSetting = settings.serverSettings[this.fullyQualifiedDatabaseFacingName_];
    if (serverSetting !== undefined) {
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

  getUserFacingExampleValues(bot, msg) {
    if (this.customUserFacingExampleValues_) {
      return this.customUserFacingExampleValues_;
    } else {
      return [this.convertDatabaseFacingValueToUserFacingValue_(bot, msg, this.defaultDatabaseFacingValue_)];
    }
  }

  getConfigurationInstructionsString(bot, msg, settings, desiredFullyQualifiedUserFacingName) {
    let prefix = '';
    if (this.fullyQualifiedUserFacingName_ !== desiredFullyQualifiedUserFacingName) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedUserFacingName + '. Here are the settings for **' + this.fullyQualifiedDatabaseFacingName_ + '**\n\n';
    }

    let examplesString = this.getUserFacingExampleValues(bot, msg).map(exampleValue => {
      return `${this.serverSettingsCommand_} ${this.fullyQualifiedUserFacingName_} ${exampleValue}`;
    }).join('\n');

    return {
      embed: {
        title: this.fullyQualifiedUserFacingName_,
        description: this.description_,
        color: this.colorForEmbeds_,
        fields: [
          {name: 'Value type', value: this.getValueTypeDescription_()},
          {name: 'Allowed values', value: this.getAllowedValueString_()},
          {name: 'Current value in this channel', value: this.getCurrentUserFacingValue(bot, msg, settings)},
          {name: 'Examples of setting value', value: examplesString}
        ]
      }
    }
  }

  getRequestInputMessageString() {
    return `What channels should the new setting apply to? You can say **all**, or **here**, or specify a list of channels, for example: **#welcome #general #bot**. You can also say 'cancel'.`;
  }

  setNewValueFromUserFacingString(bot, msg, currentSettings, newValue, channelsString) {
    if (!channelsString) {
      channelsString = 'all';
    }
    if (!this.valueTypeStrategy_.validateUserFacingValue(bot, msg, newValue)) {
      return this.createValidationFailureString_();
    }
    let databaseFacingValue = this.convertUserFacingValueToDatabaseFacingValue_(bot, msg, newValue);
    channelsString = channelsString.toLowerCase();

    if (channelsString === 'cancel') {
      return 'The settings were not changed.';
    }
    if (channelsString === 'all') {
      currentSettings.serverSettings[this.fullyQualifiedDatabaseFacingName_] = databaseFacingValue;
      clearValueFromChannelSettings(currentSettings.channelSettings, this.fullyQualifiedDatabaseFacingName_);
    } else if (channelsString === 'here') {
      if (!currentSettings.channelSettings[msg.channel.id]) {
        currentSettings.channelSettings[msg.channel.id] = {};
      }
      currentSettings.channelSettings[msg.channel.id][this.fullyQualifiedDatabaseFacingName_] = databaseFacingValue;
    } else {
      let channelIds = extractChannelIdsFromString(channelsString);
      let channelsNotInGuild = findChannelsNotInGuild(channelIds, msg.channel.guild);
      if (channelsNotInGuild.length > 0) {
        return `The setting wasn't applied. I couldn't find channels: ${channelsNotInGuild.join(', ')} in this server.`;
      }
      for (let channelId of channelIds) {
        if (!currentSettings.channelSettings[channelId]) {
          currentSettings.channelSettings[channelId] = {};
        }
        currentSettings.channelSettings[channelId][this.fullyQualifiedDatabaseFacingName_] = databaseFacingValue;
      }
    }
    let configurationInstructions = this.getConfigurationInstructionsString(bot, msg, currentSettings);
    configurationInstructions.content = 'Setting updated! Here is the updated setting.';
    return configurationInstructions;
  }

  convertUserFacingValueToDatabaseFacingValue_(bot, msg, value) {
    return this.valueTypeStrategy_.convertUserFacingValueToDatabaseFacingValue(bot, msg, value);
  }

  validateNewDatabaseFacingValue_(bot, msg, value) {
    if (this.customValidateDatabaseFacingValueFunction_) {
      let result = this.customValidateDatabaseFacingValueFunction_(bot, msg, value);
      if (result) {
        return result;
      }
    }
    if (this.allowedDatabaseFacingValues_ && Array.isArray(this.allowedDatabaseFacingValues_) && this.validateDatabaseFacingValueIsInArray_(value)) {
      return true;
    }
    if (this.allowedDatabaseFacingValues_ instanceof Range && this.validateDatabaseFacingValueIsWithinRange_(value)) {
      return true;
    }
    if (this.valueType_ === ValueType.BOOLEAN && this.validateDatabaseFacingValueIsBoolean_(value)) {
      return true;
    }
    return false;
  }

  validateDatabaseFacingValueIsBoolean_(value) {
    return typeof value === typeof true;
  }

  validateDatabaseFacingValueIsWithinRange_(value) {
    return this.allowedDatabaseFacingValues_.isWithinRange(value);
  }

  validateDatabaseFacingValueIsInArray_(value) {
    return this.allowedDatabaseFacingValues_.indexOf(value) !== -1;
  }

  convertDatabaseFacingValueToUserFacingValue_(bot, msg, value) {
    return this.valueTypeStrategy_.convertDatabaseFacingValueToUserFacingValue(bot, msg, value);
  }

  getValueTypeDescription_() {
    return this.customValueTypeDescription_ || prettyPrintForValueType[this.valueType_];
  }

  getAllowedValueString_() {
    if (this.customAllowedValuesString_) {
      return this.customAllowedValuesString_;
    }
    let prettyPrintedValueType = prettyPrintForValueType[this.valueType_];
    if (!this.allowedDatabaseFacingValues_) {
      return arbitraryAllowedValuesForType[this.valueType_];
    }
    if (this.allowedDatabaseFacingValues_ instanceof Range) {
      return prettyPrintedValueType + ' between ${this.allowedDatabaseFacingValues_.getLower()} and ${this.allowedDatabaseFacingValues_.getUpper()}';
    }
    if (Array.isArray(this.allowedDatabaseFacingValues_)) {
      return 'One of: ' + this.allowedDatabaseFacingValues_.join(', ');
    }
  }

  createValidationFailureString_() {
    return 'Could not apply that setting, because it is invalid. It must be: ' + this.getAllowedValueString_().toLowerCase();
  }
}

module.exports = Setting;
