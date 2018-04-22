
module.exports = {
  commandAliases: ['k!invite'],
  canBeChannelRestricted: true,
  cooldown: 60,
  uniqueId: 'invite530-95',
  shortDescription: 'Get a link to invite me to your server.',
  action(bot, msg) {
    return msg.channel.createMessage('You can use this link to invite me to your server! <https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot>', null, msg);
  },
};
