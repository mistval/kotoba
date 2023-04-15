const { safeSetTimeout } = require('kotoba-common').safeTimers;

async function sendAndDelete(monochrome, channelId, content, deleteInMs) {
  const bot = monochrome.getErisBot();
  const sentMessage = await bot.createMessage(channelId, content);

  safeSetTimeout(async () => {
    try {
      await sentMessage.delete();
    } catch (err) {
      if (err.code === 10008) {
        // message already deleted
        return;
      }

      const logger = monochrome.getLogger();
      logger.warn({
        event: 'ERROR DELETING OWN MESSAGE AFTER DELAY',
        err,
      });
    }
  }, deleteInMs);

  return sentMessage;
}

module.exports = sendAndDelete;
