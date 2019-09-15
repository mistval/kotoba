function stringContainsInviteLink(str) {
  return str.indexOf('discord.gg') !== -1;
}

module.exports = {
  name: 'Direct Message',
  priority: -1,
  action: (bot, msg, monochrome) => {
    if (msg.channel.guild) {
      return false;
    }

    if (stringContainsInviteLink(msg.content)) {
      return msg.channel.createMessage(`You can invite me to your server with this link! https://discordapp.com/oauth2/authorize?client_id=${bot.user.id}&scope=bot&permissions=51264`);
    }

    const prefix = monochrome.getPersistence().getPrimaryPrefixForMessage(msg);
    return msg.channel.createMessage(`Say **${prefix}help** to see my commands!`);
  },
};
