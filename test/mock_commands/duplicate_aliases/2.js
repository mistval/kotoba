module.exports = {
  commandAliases: ['bot!help', 'duplicate'],
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
