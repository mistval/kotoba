module.exports = {
  commandAliases: 'bot!help',
  uniqueId: 'not unique',
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
