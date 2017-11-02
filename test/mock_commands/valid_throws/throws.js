module.exports = {
  commandAliases: 'bot!about',
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
