const { Permissions } = require('monochrome-bot');

module.exports = {
  commandAliases: ['invite'],
  canBeChannelRestricted: true,
  cooldown: 60,
  uniqueId: 'invite530-95',
  shortDescription: 'Get a link to invite me to your server.',
  requiredBotPermissions: [Permissions.sendMessages],
  action(bot, msg) {
    return msg.channel.createMessage(`You can use this link to invite me to your server! <https://discordapp.com/oauth2/authorize?client_id=${bot.user.id}&scope=bot&permissions=52288>`, null, msg);
  },
};
