'use strict'
const reload = require('require-reload')(require);
let implementation;

/**
* A singleton to manage registered Navigation's.
*/
class NavigationManager {
  constructor() {
    this.reload();
    this.navigationForMessageId_ = {};
  }

  /**
  * Reload the class' main implementation. Since this class contains state that should not be lost during a reload, this file itself should not be reloaded.
  */
  reload() {
    implementation = reload('./implementations/navigation_manager_implementation.js');
  }

  /** Register a navigation and create the message in Discord.
  * @param {Navigation} navigaton - The navigation to register.
  * @param {expirationTimeInMs} - The time in ms until the navigation expires and reactions to it are no longer responded to.
  *   (If the navigation never expires, that would be a memory leak)
  * @param {Eris.Message} msg - The message that the navigation is being created in response to.
  */
  register(navigation, expirationTimeInMs, msg) {
    return implementation.register(this, navigation, expirationTimeInMs, msg);
  }

  /** Handled a reaction being toggled.
  * @param {Client} bot - The Eris client.
  * @param {Message} msg - The Eris message.
  * @param {String} emoji - The emoji that was toggled.
  * @param {String} userid - The user who toggled the emoji.
  */
  handleEmojiToggled(bot, msg, emoji, userId) {
    implementation.handleEmojiToggled(this, bot, msg, emoji, userId);
  }
}

module.exports = new NavigationManager();
