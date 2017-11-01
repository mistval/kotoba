'use strict'

const unreloadableDataStore = require('./../util/misc_unreloadable_data.js');
unreloadableDataStore.hookForUserAndChannel = {};

function unregisterHook(hook) {
  delete unreloadableDataStore.hookForUserAndChannel[createHookIdentifier(hook.getUserId(), hook.getChannelId())];
}

function createHookIdentifier(userId, channelId) {
  return userId + channelId;
}

class Hook {
  constructor(userId, channelId, callback) {
    this.userId_ = userId;
    this.channelId_ = channelId;
    this.callback_ = callback;
  }

  unregister() {
    unregisterHook(this);
  }

  callback(messageString) {
    this.unregister();
    return this.callback_(messageString);
  }

  getChannelId() {
    return this.channelId_;
  }

  getUserId() {
    return this.userId_;
  }
}

/**
* Lets core classes (of anyone else sneaky enough to reference it)
* to register arbitrary hooks for when a certain user says something in a certain channel
*/
module.exports = {
  name: 'Arbitrary Hook',
  action(bot, msg) {
    let hookIdentifier = createHookIdentifier(msg.author.id, msg.channel.id);
    let correspondingHook = unreloadableDataStore.hookForUserAndChannel[hookIdentifier];
    if (correspondingHook) {
      return correspondingHook.callback(msg.content);
    }
    return false;
  },
  registerHook(userId, channelId, callback) {
    let hook = new Hook(userId, channelId, callback);
    unreloadableDataStore.hookForUserAndChannel[createHookIdentifier(userId, channelId)] = hook;
    return hook;
  }
};
