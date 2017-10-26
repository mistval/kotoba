module.exports = {
  commandAliases: ['duplicate', 'bot!about'],
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
