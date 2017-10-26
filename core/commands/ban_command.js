'use strict'
const reload = require('require-reload')(require);
const persistence = require('./../persistence.js');
const CommandUtils = reload('./../util/command_utils.js');
const ErisUtils = reload('./../util/eris_utils.js');

const USAGE_MESSAGE = 'Usage: ]bancommand <command>\nExample: ]bancommand !nsfw';

/**
* A command for banning other commands from a server. This is a special command that the command manager has direct knowledge of.
*/
class BanCommand {
  /**
  * @param {Array<Command>} userCommands - All non-core commands.
  */
  constructor(userCommands) {
    this.commandAliases = [']bancommand', ']bc'];
    this.canBeChannelRestricted = false;
    this.serverAdminOnly = true;
    this.onlyInServer = true;
    this.action = (bot, msg, suffix) => this.execute_(bot, msg, suffix, userCommands);
  }

  execute_(bot, msg, suffix, userCommands) {
    if (!suffix) {
      msg.channel.createMessage(USAGE_MESSAGE);
      return 'Invalid syntax';
    }
    let command = CommandUtils.getCommandWithAlias(suffix, userCommands);
    if (!command) {
      ErisUtils.sendMessageAndDelete(msg, 'I didn\'t find a command with alias: ' + suffix);
      return 'Command not found';
    } else if (!command.canBeChannelRestricted) {
      ErisUtils.sendMessageAndDelete(msg, 'The availability of the ' + suffix + ' command can not be restricted.');
      return 'Command cannot be restricted';
    } else {
      return BanCommand.ban_(bot, msg, suffix, command.uniqueId);
    }
  }

  static ban_(bot, msg, commandAlias, commandId) {
    persistence.editAllowedChannelsForCommand(msg, commandId, () => []).then(() => {
      ErisUtils.sendMessageAndDelete(msg, 'The ' + commandAlias + ' command (and all aliases) now cannot be used in this server.');
    });
  }
}

module.exports = BanCommand;
