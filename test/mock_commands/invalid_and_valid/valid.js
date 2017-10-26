module.exports = {
  commandAliases: 'bot!about',
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
