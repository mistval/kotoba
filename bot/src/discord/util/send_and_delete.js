async function sendAndDelete(monochrome, channelId, content, deleteInMs) {
  const bot = monochrome.getErisBot();
  const sentMessage = await bot.createMessage(channelId, content);

  setTimeout(async () => {
    try {
      await sentMessage.delete();
    } catch (err) {
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
