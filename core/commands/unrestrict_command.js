'use strict'
const reload = require('require-reload')(require);
const persistence = require('./../persistence.js');
const CommandUtils = reload('./../util/command_utils.js');
const ErisUtils = reload('./../util/eris_utils.js');

const USAGE_MESSAGE = 'Usage: ]unrestrictcommand <command>\nExample: ]unrestrictcommand !catgirls';

/**
* A command for unestricting the usage of other commands. This is a special command that the command manager has direct knowledge of.
*/
class UnrestrictCommand {
  /**
  * @param {Array<Command>} userCommands - All non-core commands.
  */
  constructor(userCommands) {
    this.commandAliases = [']unrestrictcommand', ']uc'];
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
    if (command) {
      return UnrestrictCommand.unrestrict_(bot, msg, suffix, command.uniqueId);
    } else {
      ErisUtils.sendMessageAndDelete(msg, 'I didn\'t find a command called ' + suffix);
      return 'Command not found';
    }
  }

  static unrestrict_(bot, msg, commandAlias, commandId) {
    persistence.editAllowedChannelsForCommand(msg, commandId, () => undefined).then(() => {
      ErisUtils.sendMessageAndDelete(msg, 'The ' + commandAlias + ' command (and all aliases) can now be used anywhere in this server.');
    });
  }
}

module.exports = UnrestrictCommand;
