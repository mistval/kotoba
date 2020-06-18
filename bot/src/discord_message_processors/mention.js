function isBotMention(msg, monochrome) {
  if (!msg.content.startsWith('<')) {
    return false;
  }

  const botId = monochrome.getErisBot().user.id;

  if (msg.content.startsWith(`<@${botId}>`)) {
    return true;
  }

  if (msg.content.startsWith(`<@!${botId}>`)) {
    return true;
  }

  return false;
}

module.exports = {
  name: 'Mention',
  priority: -2,
  action: (bot, msg, monochrome) => {
    if (!isBotMention(msg, monochrome)) {
      return false;
    }

    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    const prefix = monochrome.getPersistence().getPrimaryPrefixForMessage(msg);
    return msg.channel.createMessage(`Hi ${msg.author.username}, say **${prefix}help** to see my commands!`);
  },
};
