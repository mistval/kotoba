'use strict'
const unreloadableDataStore = require('./../util/misc_unreloadable_data.js');

if (!unreloadableDataStore.hookForUserAndChannel) {
  unreloadableDataStore.hookForUserAndChannel = {};
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

  register() {
    let existingHook = unreloadableDataStore.hookForUserAndChannel[this.getIdentifier_()];
    if (existingHook) {
      existingHook.unregister();
    }
    unreloadableDataStore.hookForUserAndChannel[this.getIdentifier_()] = this;
    this.registered_ = true;
  }

  unregister() {
    delete unreloadableDataStore.hookForUserAndChannel[this.getIdentifier_()];
    this.registered_ = false;
  }

  getIsRegistered() {
    return this.registered_;
  }

  callback(messageString) {
    return this.callback_(messageString);
  }

  getIdentifier_() {
    return createHookIdentifier(this.userId_, this.channelId_);
  }
}

/**
* Lets core classes (of anyone else sneaky enough to reference it)
* to register arbitrary hooks for when a certain user says something in a certain channel
*/
module.exports = {
  name: 'Followup Message',
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
    hook.register();
    return hook;
  }
};
