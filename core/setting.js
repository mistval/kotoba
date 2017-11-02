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

function findChannelsNotInGuild(channelIds, channelsInGuild) {
  return channelIds.filter(channelId => {
    return !channelsInGuild.find(guildChannel => guildChannel.id === channelId);
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
  (value) => value,
  (value) => value.toString(),
  (value) => true
);
strategyForValueType[ValueType.INTEGER] = new ValueTypeStrategy(
  (value) => parseInt(value),
  (value) => value.toString(),
  (value) => typeof parseInt(value) === typeof 1
);
strategyForValueType[ValueType.FLOAT] = new ValueTypeStrategy(
  (value) => parseFloat(value),
  (value) => value.toString(),
  (value) => typeof parseFloat(value) === typeof 1.5
);
strategyForValueType[ValueType.BOOLEAN] =  new ValueTypeStrategy(
  (value) => value.toLowerCase() === 'true',
  (value) => value.toString(),
  (value) => value.toLowerCase() === 'true' || value.toLowerCase() === 'false'
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

/** Represents a setting leaf, as opposed to a category of settings */
class Setting extends AbstractSettingElement {
  /**
  * @param {Object} settingsBlob - The raw, unsanitized data for the setting.
  * @param {String} qualificationWithoutName - The qualification for this setting up until its parent category. (for example /commands/help/etc/etc/etc)
  * @param {String} settingsCategorySeparator - The string that is used to separate the setting's qualification, like the /s in a filepath.
  * @param {Number} colorForEmbeds - What color embeds returned by this class should be.
  * @param {String} serverSettingsCommandName - The name of the command to interact with server settings.
  */
  constructor(settingsBlob, qualificationWithoutName, settingsCategorySeparator, colorForEmbeds, serverSettingsCommandName) {
    super();
    validateSettingsBlob(settingsBlob, settingsCategorySeparator);
    this.colorForEmbeds_ = colorForEmbeds;
    this.serverSettingsCommandName_ = serverSettingsCommandName;
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

  /**
  * Gets the child for the specified fully qualified name (that parameter is not needed so it is omitted)
  * or if there isn't one, the nearest child. Since this class represents a leaf in the tree, the answer is always this.
  * @returns {Setting} The child for the fully qualified name (always 'this' because a Setting has no children).
  */
  getChildForFullyQualifiedUserFacingName() {
    return this;
  }

  /**
  * @returns {String} The fully qualfied user facing name for this.
  */
  getFullyQualifiedUserFacingName() {
    return this.fullyQualifiedUserFacingName_;
  }

  /**
  * Gets bot content instructing the user how to proceed at this level of the instructions hierarchy.
  * @param {String} channelId - The channel that we are looking at the settings for.
  * @param {Object} settings - The settings object from the database for the server we are looking at the settings for.
  * @param {String} desiredFullyQualifiedUserFacingName - The fully qualified setting name we were searching for.
  *   Since getChildForFullyQualifiedName returns the nearest matching child, even if there is no exact match,
  *   the desiredFullyQualifiedUserFacingName may not be the one we landed on.
  * @returns {Object} Discord bot content that should be displayed to the user.
  */
  getConfigurationInstructionsBotContent(channelId, settings, desiredFullyQualifiedUserFacingName) {
    let prefix = '';
    if (this.fullyQualifiedUserFacingName_ !== desiredFullyQualifiedUserFacingName) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedUserFacingName + '. Here are the settings for **' + this.fullyQualifiedDatabaseFacingName_ + '**\n\n';
    }

    let examplesString = this.getUserFacingExampleValues().map(exampleValue => {
      return `${this.serverSettingsCommandName_} ${this.fullyQualifiedUserFacingName_} ${exampleValue}`;
    }).join('\n');

    return {
      embed: {
        title: this.fullyQualifiedUserFacingName_,
        description: this.description_,
        color: this.colorForEmbeds_,
        fields: [
          {name: 'Value type', value: this.getValueTypeDescription_()},
          {name: 'Allowed values', value: this.getAllowedValueString_()},
          {name: 'Current value in this channel', value: this.getCurrentUserFacingValue(channelId, settings)},
          {name: 'Examples of setting value', value: examplesString}
        ]
      }
    }
  }

  /**
  * @param {String} channelId - The ID of the channel we are looking at the settings for.
  * @param {Object} settings - The settings object for the server we are looking at the settings for.
  * @returns {Object} The current database facing value of this setting for the channel we are examining the settings for.
  */
  getCurrentDatabaseFacingValue(channelId, settings) {
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

  /**
  * @param {String} channelId - The ID of the channel we are looking at the settings for.
  * @param {Object} settings - The settings object for the server we are looking at the settings for.
  * @returns {Object} The current user facing value for the channel we are examing the settings for.
  */
  getCurrentUserFacingValue(channelId, settings) {
    return this.convertDatabaseFacingValueToUserFacingValue_(this.getCurrentDatabaseFacingValue(channelId, settings));
  }

  /**
  * @returns {Object} The default user facing value of the setting.
  */
  getDefaultUserFacingValue() {
    return this.convertDatabaseFacingValueToUserFacingValue_(this.defaultDatabaseFacingValue_);
  }

  /**
  * @returns {Array<String>} Example(s) of values that can be used for this setting
  */
  getUserFacingExampleValues() {
    if (this.customUserFacingExampleValues_) {
      return this.customUserFacingExampleValues_;
    } else {
      return [this.convertDatabaseFacingValueToUserFacingValue_(this.defaultDatabaseFacingValue_)];
    }
  }

  /**
  * Setting a setting is a two-step process. First you specify the new setting,
  * then the bot will ask you which channel(s) you want to apply the setting to.
  * After the user specifies the new setting, this method should be called to get
  * instructions to show the user for the next step of the process.
  * @returns {String} Instructions for the next step. Should be sent directly to the user.
  */
  getNextStepInstructionsForSettingSetting() {
    return `What channels should the new setting apply to? You can say **all**, or **here**, or specify a list of channels, for example: **#welcome #general #bot**. You can also say 'cancel'.`;
  }

  /**
  * If possible, sets the new setting value, or rejects it.
  * @param {String} currentChannelId - The channel the command was invoked in.
  * @param {Array<Eris.Channel>} channelsInGuild - The array of channels for the server the command was invoked in.
  * @param {Object} currentSetting - The settings object for the server the command was invoked in.
  * @param {Object} newValue - The desired new value for this setting.
  * @param {String} secondStepUserResponseString - What the user answered to "what channels do you want to apply this setting to"
  * @returns {String} The result of the operation in the form of a string that the bot should send to the user.
  */
  setNewValueFromUserFacingString(currentChannelId, channelsInGuild, currentSettings, newValue, secondStepUserResponseString) {
    if (!secondStepUserResponseString) {
      secondStepUserResponseString = 'all';
    }
    if (!this.valueTypeStrategy_.validateUserFacingValue(newValue)) {
      return this.createValidationFailureString_();
    }
    let databaseFacingValue = this.convertUserFacingValueToDatabaseFacingValue_(newValue);
    secondStepUserResponseString = secondStepUserResponseString.toLowerCase();

    if (secondStepUserResponseString === 'cancel') {
      return 'The settings were not changed.';
    }
    if (secondStepUserResponseString === 'all') {
      currentSettings.serverSettings[this.fullyQualifiedDatabaseFacingName_] = databaseFacingValue;
      clearValueFromChannelSettings(currentSettings.channelSettings, this.fullyQualifiedDatabaseFacingName_);
    } else if (secondStepUserResponseString === 'here') {
      if (!currentSettings.channelSettings[currentChannelId]) {
        currentSettings.channelSettings[currentChannelId] = {};
      }
      currentSettings.channelSettings[currentChannelId][this.fullyQualifiedDatabaseFacingName_] = databaseFacingValue;
    } else {
      let channelIds = extractChannelIdsFromString(secondStepUserResponseString);
      let channelsNotInGuild = findChannelsNotInGuild(channelIds, channelsInGuild);
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
    let configurationInstructions = this.getConfigurationInstructionsBotContent(currentChannelId, currentSettings);
    configurationInstructions.content = 'Setting updated! Here is the updated setting.';
    return configurationInstructions;
  }

  convertUserFacingValueToDatabaseFacingValue_(value) {
    return this.valueTypeStrategy_.convertUserFacingValueToDatabaseFacingValue(value);
  }

  validateNewDatabaseFacingValue_(value) {
    if (this.customValidateDatabaseFacingValueFunction_) {
      let result = this.customValidateDatabaseFacingValueFunction_(value);
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

  convertDatabaseFacingValueToUserFacingValue_(value) {
    return this.valueTypeStrategy_.convertDatabaseFacingValueToUserFacingValue(value);
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
