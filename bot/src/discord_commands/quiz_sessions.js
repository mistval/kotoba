const quizManager = require('../common/quiz/manager.js');

module.exports = {
  commandAliases: ['qs'],
  botAdminOnly: true,
  uniqueId: 'quiz_sessions',
  hidden: true,
  action(bot, msg) {
    const sessionInfo = quizManager.getActiveSessionInformation();
    const output = sessionInfo.map((info) => {
      const ownerUserName = bot.users.get(info.ownerId).username;
      const guild = bot.guilds.get(info.locationId);
      const guildName = guild ? guild.name : 'DM';
      const { quizName } = info;

      return `**${quizName}** by **${ownerUserName}** in **${guildName}**`;
    }).join('\n') || 'No active sessions.';

    return msg.channel.createMessage(output, null, msg);
  },
};
