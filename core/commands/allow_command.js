'use strict'
const reload = require('require-reload')(require);
const persistence = require('./../persistence.js');
const CommandUtils = reload('./../util/command_utils.js');
const ErisUtils = reload('./../util/eris_utils.js');

const USAGE_MESSAGE = 'Usage: ]allowcommand <command> <allowed channel #1> <allowed channel #2> ...\nExample: ]allowcommand !catgirls #nsfw1 #nsfw2';

function allow_(bot, msg, commandAlias, commandId, channelLinks) {
  let channelIds = [];
  for (let channelLink of channelLinks) {
    let channelId = channelLink.replace('<#', '');
    channelId = channelId.replace('>', '');
    let channel = msg.channel.guild.channels.find((c) => {
      return c.id === channelId;
    });

    if (!channel) {
      ErisUtils.sendMessageAndDelete(msg, 'Didn\'t find a channel with ID ' + channelId + ' in this server.');
      return 'Channel ID unknown';
    }

    channelIds.push(channelId);
  }

  persistence.editAllowedChannelsForCommand(msg, commandId, allowedChannels => {
    if (!allowedChannels) {
      allowedChannels = [];
    }
    for (let channelId of channelIds) {
      if (allowedChannels.indexOf(channelId) === -1) {
        allowedChannels.push(channelId);
      }
    }
    return allowedChannels;
  }).then(allowedChannels => {
    let allowedChannelsString = '';
    for (let allowedChannel of allowedChannels) {
      allowedChannelsString += '<#' + allowedChannel + '> ';
    }
    ErisUtils.sendMessageAndDelete(msg, 'The ' + commandAlias + ' command (and all aliases) can now only be used in the following channels: ' + allowedChannelsString);
  });
}

/**
* A server admin command for choosing which channels to allow commands in. This is a special command that the command manager has direct knowledge of.
*/
class AllowCommand {
  /**
  * @param {Array<Command>} userCommands - All non-core commands.
  */
  constructor(userCommands) {
    this.commandAliases = [']allowcommand', ']ac'];
    this.canBeChannelRestricted = false;
    this.serverAdminOnly = true;
    this.onlyInServer = true;
    this.action = (bot, msg, suffix) => this.execute_(bot, msg, suffix, userCommands);
  }

  execute_(bot, msg, suffix, userCommands) {
    let tokens = suffix.split(' ');
    if (tokens.length < 2) {
      msg.channel.createMessage(USAGE_MESSAGE);
      return 'Invalid syntax';
    }
    let inputCommandAlias = tokens[0];
    let command = CommandUtils.getCommandWithAlias(inputCommandAlias, userCommands);
    if (!command) {
      ErisUtils.sendMessageAndDelete(msg, 'I didn\'t find a command with alias: ' + inputCommandAlias);
      return 'Command not found';
    } else if (!command.canBeChannelRestricted) {
      ErisUtils.sendMessageAndDelete(msg, 'The availability of the' + inputCommandAlias + ' command can not be restricted.');
      return 'Command cannot be restricted';
    } else {
      tokens.shift();
      return allow_(bot, msg, inputCommandAlias, command.uniqueId, tokens);
    }
  }
}

module.exports = AllowCommand;
