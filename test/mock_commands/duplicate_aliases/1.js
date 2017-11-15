module.exports = {
  commandAliases: ['duplicate', 'bot!about'],
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
