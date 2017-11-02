'use strict'
const reload = require('require-reload')(require);
const persistence = require('./persistence.js');
const ErisUtils = reload('./util/eris_utils.js');

function sanitizeCommandData(commandData) {
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
  } else if (commandData.cooldown < 0) {
    commandData.cooldown = 0;
  } else if (typeof commandData.cooldown !== typeof 1.5) {
    throw new Error('Invalid cooldown, it\'s not a number');
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
  constructor(commandData) {
    commandData = sanitizeCommandData(commandData);
    this.canBeChannelRestricted_ = commandData.canBeChannelRestricted;
    this.aliases = commandData.commandAliases;
    this.uniqueId = commandData.uniqueId;
    this.action_ = commandData.action;
    this.serverAdminOnly_ = !!commandData.serverAdminOnly;
    this.botAdminOnly_ = !!commandData.botAdminOnly;
    this.onlyInServer_ = !!commandData.onlyInServer;
    this.cooldown_ = commandData.cooldown = commandData.cooldown;
    this.requiredSettings_ = commandData.requiredSettings;
    this.usersCoolingDown_ = [];
  }

  createEnabledSetting() {
    if (this.canBeChannelRestricted_) {
      return {
        userFacingName: this.aliases[0] + '_enabled',
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
  handle(bot, msg, suffix, config) {
    if (this.usersCoolingDown_.indexOf(msg.author.id) !== -1) {
      ErisUtils.sendMessageAndDelete(msg, msg.author.username + ', that command has a ' + this.cooldown_.toString() + ' second cooldown.');
      return 'Not cooled down';
    }
    let isBotAdmin = config.botAdminIds.indexOf(msg.author.id) !== -1;
    if (this.botAdminOnly_ && !isBotAdmin) {
      ErisUtils.sendMessageAndDelete(msg, 'Only a bot admin can use that command.');
      return 'User is not a bot admin';
    }
    if (this.onlyInServer_ && msg.channel.guild === undefined) {
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

    if (this.uniqueId && msg.channel.guild) {
      return persistence.getAllowedChannelsForCommand(msg, this.uniqueId).then(allowedChannels => {
        if (!allowedChannels) {
          return this.invokeAction_(bot, msg, suffix);
        }

        if (allowedChannels.length === 0) {
          ErisUtils.sendMessageAndDelete(msg, 'That command is disabled in this server.');
          return 'Command disabled in server';
        } else if (allowedChannels.indexOf(msg.channel.id) !== -1) {
          return this.invokeAction_(bot, msg, suffix);
        } else {
          let allowedChannelsString = '';
          for (let allowedChannel of allowedChannels) {
            allowedChannelsString += '<#' + allowedChannel + '> ';
          }
          ErisUtils.sendMessageAndDelete(msg,  'To use that command, please go to one of these channels: ' + allowedChannelsString);
          return 'Command disabled in channel';
        }
      });
    } else {
      return this.invokeAction_(bot, msg, suffix);
    }
  }

  invokeAction_(bot, msg, suffix) {
    if (this.cooldown_ !== 0) {
      this.usersCoolingDown_.push(msg.author.id);
    }
    setTimeout(() => {
      let index = this.usersCoolingDown_.indexOf(msg.author.id);
      this.usersCoolingDown_.splice(index, 1);
    },
    this.cooldown_ * 1000);
    return this.action_(bot, msg, suffix);
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
