'use strict'

/**
* A command for displaying and changing settings. This is a special command that the command manager has direct knowledge of.
*/
class Settings {
  /**
  * @param {Array<Command>} userCommands - All non-core commands.
  */
  constructor(settingsManager) {
    this.commandAliases = [']settings'];
    this.canBeChannelRestricted = false;
    this.serverAdminOnly = true;
    this.action = (bot, msg, suffix) => this.execute_(bot, msg, suffix, settingsManager);
  }

  execute_(bot, msg, suffix, settingsManager) {
    return msg.channel.createMessage(settingsManager.getConfigurationInstructionsString(bot, msg, suffix));
  }
}

module.exports = Settings;
