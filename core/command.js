'use strict'
const reload = require('require-reload')(require);
const persistence = require('./persistence.js');
const ErisUtils = reload('./util/eris_utils.js');

function sanitizeCommandData(commandData, settingsCategorySeparator) {
  if (!commandData) {
    throw new Error('No command data.');
  } else if (!commandData.commandAliases) {
    throw new Error('Command does not have command aliases.');
  } else if (commandData.commandAliases.length === 0) {
    throw new Error('Command does not have command aliases.');
  } else if (typeof commandData.commandAliases === typeof '') {
    commandData.commandAliases = [commandData.commandAliases];
  }

  let aliases = [];
  for (let alias of commandData.commandAliases) {
    if (typeof alias !== typeof '' || alias === '') {
      throw new Error('Command alias is not a string, or is an empty string.');
    }
    aliases.push(alias.toLowerCase());
  }
  commandData.commandAliases = aliases;

  if (!commandData.action || typeof commandData.action !== 'function') {
    throw new Error('Command does not have an action, or it is not a function.');
  } else if (commandData.serverAdminOnly !== undefined && typeof commandData.serverAdminOnly !== typeof true) {
    throw new Error('Invalid serverAdminOnly value');
  } else if (commandData.botAdminOnly !== undefined && typeof commandData.botAdminOnly !== typeof true) {
    throw new Error('Invalid botAdminOnly value');
  } else if (commandData.canBeChannelRestricted !== undefined && typeof commandData.canBeChannelRestricted !== typeof true) {
    throw new Error('Invalid canBeChannelRestricted value');
  } else if (commandData.onlyInServer !== undefined && typeof commandData.onlyInServer !== typeof true) {
    throw new Error('Invalid onlyInServer value');
  } else if (commandData.canBeChannelRestricted === undefined) {
    if (commandData.serverAdminOnly || commandData.botAdminOnly) {
      commandData.canBeChannelRestricted = false;
    } else {
      commandData.canBeChannelRestricted = true;
    }
  } else {
    commandData.canBeChannelRestricted = commandData.canBeChannelRestricted;
  }

  if (commandData.cooldown === undefined) {
    commandData.cooldown = 0;
  } else if (typeof commandData.cooldown !== typeof 1.5) {
    throw new Error('Invalid cooldown, it\'s not a number');
  } else if (commandData.cooldown < 0) {
    throw new Error('Cooldown is less than 0. Cannot reverse time.');
  }
  if (commandData.canBeChannelRestricted && (!commandData.uniqueId || typeof commandData.uniqueId !== typeof '')) {
    throw new Error('Command has canBeChannelRestricted true (or undefined, defaulting to true), but does not have a uniqueId, or its uniqueId is not a string. Commands that can be channel restricted must have a uniqueId.');
  }

  if (typeof commandData.requiredSettings === typeof '') {
    commandData.requiredSettings = [commandData.requiredSettings];
  } else if (commandData.requiredSettings === undefined) {
    commandData.requiredSettings = [];
  }
  if (commandData.requiredSettings.find(setting => typeof setting !== typeof '')) {
    throw new Error('A required setting is not a string.');
  }
  if (settingsCategorySeparator && commandData.commandAliases.find(alias => alias.indexOf(settingsCategorySeparator) !== -1)) {
    throw new Error(`An alias contains the settings category separator (${settingsCategorySeparator}). It must not.`);
  }
  return commandData;
}

/**
* Represents a command that users can invoke.
* @property {Array<String>} aliases - A list of aliases that should trigger this command.
* @property {Boolean} canBeChannelRestricted - True if the command is allowed to be restricted to individual server channels.
* @property {String} uniqueId - A uniqueId for the command (for purposes of persisting information about it).
*/
class Command {
  /**
  * @param {Object} commandData - The raw command loaded from a command file.
  */
  constructor(commandData, settingsCategorySeparator) {
    commandData = sanitizeCommandData(commandData, settingsCategorySeparator);
    this.canBeChannelRestricted_ = commandData.canBeChannelRestricted;
    this.aliases = commandData.commandAliases;
    this.uniqueId = commandData.uniqueId;
    this.requiredSettings_ = commandData.requiredSettings;
    this.action_ = commandData.action;
    this.serverAdminOnly_ = !!commandData.serverAdminOnly;
    this.botAdminOnly_ = !!commandData.botAdminOnly;
    this.onlyInServer_ = !!commandData.onlyInServer;
    this.cooldown_ = commandData.cooldown = commandData.cooldown;
    this.usersCoolingDown_ = [];
    this.settingsCategorySeparator_ = settingsCategorySeparator;
  }

  createEnabledSetting() {
    if (this.canBeChannelRestricted_) {
      return {
        userFacingName: this.getEnabledSettingUserFacingName_(),
        databaseFacingName: this.uniqueId + '_enabled',
        type: 'SETTING',
        description: `This setting controls whether the ${this.aliases[0]} command (and all of its aliases) is allowed to be used or not.`,
        valueType: 'BOOLEAN',
        defaultDatabaseFacingValue: true,
      }
    }
  }

  /**
  * Handle a command.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {Eris.Message} msg - The Eris message to handle.
  * @param {String} suffix - The command suffix.
  * @returns {(String|undefined|Promise)} An error string if there is a benign, expected error (invalid command syntax, etc).
  *    undefined if there is no error.
  *    A promise can also be returned. It should resolve with either a benign error string, or undefined.
  *    If it rejects, the error will be logged, and the generic error message will be sent to the channel.
  *    (Or if the error is a PublicError, or if it has a publicMessage property, the value of that property
  *    will be sent to the channel instead of the generic error message)
  */
  handle(bot, msg, suffix, config, settingsGetter, settingsCategoryFullyQualifiedUserFacingName) {
    if (this.usersCoolingDown_.indexOf(msg.author.id) !== -1) {
      ErisUtils.sendMessageAndDelete(msg, msg.author.username + ', that command has a ' + this.cooldown_.toString() + ' second cooldown.');
      return 'Not cooled down';
    }
    let isBotAdmin = config.botAdminIds.indexOf(msg.author.id) !== -1;
    if (this.botAdminOnly_ && !isBotAdmin) {
      ErisUtils.sendMessageAndDelete(msg, 'Only a bot admin can use that command.');
      return 'User is not a bot admin';
    }
    if (this.onlyInServer_ && !msg.channel.guild) {
      ErisUtils.sendMessageAndDelete(msg, 'That command can only be used in a server.');
      return 'Command can only be used in server';
    }
    if (this.serverAdminOnly_ && !isBotAdmin) {
      let isServerAdmin = userIsServerAdmin(msg, config);

      if (!isServerAdmin) {
        let errorMessage = 'You must be a server admin ';
        if (config.serverAdminRoleName) {
          errorMessage += 'or have a role called \'' + config.serverAdminRoleName + '\' ';
        }
        errorMessage += 'in order to do that.';
        ErisUtils.sendMessageAndDelete(msg, errorMessage);
        return 'User is not a server admin';
      }
    }

    let requiredSettings = this.requiredSettings_;
    let enabledSettingFullyQualifiedUserFacingName = this.getEnabledSettingFullyQualifiedUserFacingName_(settingsCategoryFullyQualifiedUserFacingName);
    if (this.canBeChannelRestricted_) {
      requiredSettings = requiredSettings.concat([enabledSettingFullyQualifiedUserFacingName]);
    }
    return settingsGetter.getSettings(bot, msg, requiredSettings).then(settings => {
      if (settings[enabledSettingFullyQualifiedUserFacingName] === true || settings[enabledSettingFullyQualifiedUserFacingName] === undefined) {
        return this.invokeAction_(bot, msg, suffix, settings);
      }

      ErisUtils.sendMessageAndDelete(msg, 'That command is disabled in this channel.');
      return 'Command disabled';
    });
  }

  invokeAction_(bot, msg, suffix, settings) {
    if (this.cooldown_ !== 0) {
      this.usersCoolingDown_.push(msg.author.id);
    }
    setTimeout(() => {
      let index = this.usersCoolingDown_.indexOf(msg.author.id);
      this.usersCoolingDown_.splice(index, 1);
    },
    this.cooldown_ * 1000);
    return this.action_(bot, msg, suffix, settings);
  }

  getEnabledSettingUserFacingName_() {
    return this.aliases[0];
  }

  getEnabledSettingFullyQualifiedUserFacingName_(fullyQualifiedUserFacingCategoryName) {
    return fullyQualifiedUserFacingCategoryName + this.settingsCategorySeparator_ + this.getEnabledSettingUserFacingName_();
  }
}

function userIsServerAdmin(msg, config) {
  if (!msg.channel.guild) {
    return true;
  }

  let permission = msg.member.permission.json;
  if (permission.manageGuild || permission.administrator || permission.manageChannels) {
    return true;
  }

  let serverAdminRole = msg.channel.guild.roles.find((role) => {
    return role.name.toLowerCase() === config.serverAdminRoleName.toLowerCase();
  });

  if (serverAdminRole && msg.member.roles.indexOf(serverAdminRole.id) !== -1) {
    return true;
  }

  return false;
}

module.exports = Command;
