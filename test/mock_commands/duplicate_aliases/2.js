module.exports = {
  commandAliases: ['bot!help', 'duplicate'],
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
