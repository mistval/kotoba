
const unreloadableDataStore = require('./../unreloadable_data.js');

if (!unreloadableDataStore.hookForUserAndChannel) {
  unreloadableDataStore.hookForUserAndChannel = {};
}

function createHookIdentifier(userId, channelId) {
  return userId + channelId;
}

class Hook {
  constructor(userId, channelId, callback, logger) {
    this.userId = userId;
    this.channelId = channelId;
    this.callback = callback;
    this.logger = logger;
  }

  register() {
    const existingHook = unreloadableDataStore.hookForUserAndChannel[this.getIdentifier()];
    if (existingHook) {
      existingHook.unregister();
    }
    unreloadableDataStore.hookForUserAndChannel[this.getIdentifier()] = this;
    this.registered = true;
  }

  unregister() {
    delete unreloadableDataStore.hookForUserAndChannel[this.getIdentifier()];
    this.registered = false;
    clearTimeout(this.timer);
    delete this.timer;
  }

  setExpirationInMs(expiration, timeoutCallback) {
    clearTimeout(this.timer);
    delete this.timer;
    this.timer = setTimeout(
      () => {
        try {
          this.unregister();
          timeoutCallback();
        } catch (err) {
          this.logger.error({
            event: 'HOOK EXPIRATION CALLBACK ERRORED',
            err,
          });
        }
      },
      expiration,
    );
  }

  getIdentifier() {
    return createHookIdentifier(this.userId, this.channelId);
  }
}

/**
* Lets core classes (or anyone else sneaky enough to reference it)
* register arbitrary hooks for when a certain user says something in a certain channel
*/
module.exports = {
  name: 'Followup Message',
  action(bot, msg, monochrome) {
    const hookIdentifier = createHookIdentifier(msg.author.id, msg.channel.id);
    const correspondingHook = unreloadableDataStore.hookForUserAndChannel[hookIdentifier];
    if (correspondingHook) {
      return correspondingHook.callback(correspondingHook, msg, monochrome);
    }
    return false;
  },
  registerHook(userId, channelId, callback, logger) {
    const hook = new Hook(userId, channelId, callback, logger);
    hook.register();
    return hook;
  },
};
