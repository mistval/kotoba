
/**
* Get a text file list of all servers the bot is in.
* Syntax: }servers
*/
module.exports = {
  commandAliases: ['}servers', '}s'],
  botAdminOnly: true,
  shortDescription: 'Show servers that I\'m in.',
  action(bot, msg) {
    const guildsString = Array.from(bot.guilds.values()).map(guild => `${guild.name} (${guild.memberCount} members)`).join('\n');
    return msg.channel.createMessage('Here is a list of servers that I\'m in.', { file: guildsString, name: 'servers.txt' });
  },
};
