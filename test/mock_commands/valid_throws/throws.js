module.exports = {
  commandAliases: 'bot!about',
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
