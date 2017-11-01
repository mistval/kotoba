'use strict'

const userAndChannelHook = require('./../message_processors/user_and_channel_hook.js');

const NEXT_STEP_EXPIRATION_TIME_IN_MS = 1000 * 120;

function registerHook(msg, userResponseCallback) {
  let hook = userAndChannelHook.registerHook(msg.author.id, msg.channel.id, message => {
    let result = userResponseCallback(message);
    if (typeof result === 'string') {
      msg.channel.createMessage(result);
    }
    return result;
  });
  setTimeout(() => {
      hook.unregister();
      msg.channel.createMessage('Settings have not been updated.');
    },
    NEXT_STEP_EXPIRATION_TIME_IN_MS);
}

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
    let suffixParts = suffix.split(' ');
    if (suffixParts.length < 2) {
      return settingsManager.getConfigurationInstructionsString(bot, msg, suffix).then(responseString => {
        return msg.channel.createMessage(responseString);
      });
    } else {
      return settingsManager.initiateSetSetting(bot, msg, suffixParts[0], suffixParts[1]).then(results => {
        let errorString = results.errorString;
        if (errorString) {
          return msg.channel.createMessage(errorString);
        } else {
          let nextStepInstructions = results.nextStepInstructions;
          let userResponseCallback = results.userResponseCallback;
          registerHook(msg, userResponseCallback);
          return msg.channel.createMessage(nextStepInstructions);
        }
      });
    }
  }
}

module.exports = Settings;
