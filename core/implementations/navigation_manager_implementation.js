'use strict'
const Logger = require('./../logger.js');

const LOGGER_TITLE = 'NAVIGATION';

class NavigationManagerImplementation {
  static register(navigationManagerState, navigation, expirationTimeInMs, msg) {
    return navigation.createMessage(msg).then(messageId => {
      navigationManagerState.navigationForMessageId_[messageId] = navigation;
      setTimeout(NavigationManagerImplementation.unregister_, expirationTimeInMs, navigationManagerState, messageId);
    });
  }

  static unregister_(navigationManagerState, messageId) {
    delete navigationManagerState.navigationForMessageId_[messageId];
  }

  static handleEmojiToggled(navigationManagerState, bot, msg, emoji, userId) {
    let navigation = navigationManagerState.navigationForMessageId_[msg.id];
    if (navigation) {
      navigation.handleEmojiToggled(bot, emoji, userId);
    }
  }
}

module.exports = NavigationManagerImplementation;
