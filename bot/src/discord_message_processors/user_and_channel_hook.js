const { safeSetTimeout } = require('kotoba-common').safeTimers;

const hookForUserAndChannel = {};

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
    const existingHook = hookForUserAndChannel[this.getIdentifier()];
    if (existingHook) {
      existingHook.unregister();
    }
    hookForUserAndChannel[this.getIdentifier()] = this;
    this.registered = true;
  }

  unregister() {
    delete hookForUserAndChannel[this.getIdentifier()];
    this.registered = false;
    clearTimeout(this.timer);
    delete this.timer;
  }

  setExpirationInMs(expiration, timeoutCallback) {
    clearTimeout(this.timer);
    delete this.timer;
    this.timer = safeSetTimeout(
      async () => {
        try {
          this.unregister();
          await timeoutCallback();
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
  priority: 1000,
  action(bot, msg, monochrome) {
    const hookIdentifier = createHookIdentifier(msg.author.id, msg.channel.id);
    const correspondingHook = hookForUserAndChannel[hookIdentifier];
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
