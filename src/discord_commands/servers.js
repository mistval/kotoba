
/**
* Get a text file list of all servers the bot is in.
* Syntax: }servers
*/
module.exports = {
  commandAliases: ['}servers', '}s'],
  botAdminOnly: true,
  shortDescription: 'Show servers that I\'m in.',
  hidden: true,
  uniqueId: 'servers',
  action(erisBot, msg) {
    const guildsString = Array.from(erisBot.guilds.values()).map(guild => `${guild.name} (${guild.memberCount} members)`).join('\n');
    return msg.channel.createMessage('Here is a list of servers that I\'m in.', { file: guildsString, name: 'servers.txt' });
  },
};
