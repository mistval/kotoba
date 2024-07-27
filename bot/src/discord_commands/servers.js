/**
* Get a text file list of all servers the bot is in.
* Syntax: }servers
*/
module.exports = {
  commandAliases: ['servers'],
  botAdminOnly: true,
  shortDescription: 'Show servers that I\'m in.',
  hidden: true,
  uniqueId: 'servers',
  action(bot, msg) {
    const guildsString = Array.from(bot.guilds.values())
      .sort((a, b) => b.memberCount - a.memberCount)
      .map((guild) => `${guild.name} (${guild.memberCount} members)`)
      .join('\n');

    const content = {
      content: 'Here is a list of servers that I\'m in.',
      attachments: [{ file: guildsString, filename: 'servers.txt' }],
    };

    return msg.channel.createMessage(content);
  },
};
