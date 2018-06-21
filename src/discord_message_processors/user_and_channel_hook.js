'use strict'
const unreloadableDataStore = require('./../unreloadable_data.js');

if (!unreloadableDataStore.hookForUserAndChannel) {
  unreloadableDataStore.hookForUserAndChannel = {};
}

function createHookIdentifier(userId, channelId) {
  return userId + channelId;
}

class Hook {
  constructor(userId, channelId, callback, logger) {
    this.userId_ = userId;
    this.channelId_ = channelId;
    this.callback_ = callback;
    this.logger_ = logger;
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
    clearTimeout(this.timer_);
    delete this.timer_;
  }

  setExpirationInMs(expiration, timeoutCallback) {
    clearTimeout(this.timer_);
    delete this.timer_;
    this.timer_ = setTimeout(() => {
      try {
        this.unregister();
        timeoutCallback();
      } catch (err) {
        this.logger_.logFailure('CORE', 'Hook expiration callback threw error', err);
      }
    },
    expiration);
  }

  callback(msg, monochrome) {
    return this.callback_(this, msg, monochrome);
  }

  getIdentifier_() {
    return createHookIdentifier(this.userId_, this.channelId_);
  }
}

/**
* Lets core classes (or anyone else sneaky enough to reference it)
* register arbitrary hooks for when a certain user says something in a certain channel
*/
module.exports = {
  name: 'Followup Message',
  action(erisBot, msg, monochrome) {
    let hookIdentifier = createHookIdentifier(msg.author.id, msg.channel.id);
    let correspondingHook = unreloadableDataStore.hookForUserAndChannel[hookIdentifier];
    if (correspondingHook) {
      return correspondingHook.callback(msg, monochrome);
    }
    return false;
  },
  registerHook(userId, channelId, callback, logger) {
    let hook = new Hook(userId, channelId, callback, logger);
    hook.register();
    return hook;
  }
};
