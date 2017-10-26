module.exports = {
  commandAliases: 'bot!about',
  uniqueId: 'not unique',
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
