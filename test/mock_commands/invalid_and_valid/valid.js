module.exports = {
  commandAliases: 'bot!about',
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
