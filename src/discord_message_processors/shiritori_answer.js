const shiritoriManager = require('shiritori');

module.exports = {
  name: 'Shiritori Answer',
  action: (bot, msg) => {
    const locationId = msg.channel.id;
    if (!shiritoriManager.gameExists(locationId)) {
      return false;
    }

    const userId = msg.author.id;
    const contentLowerCase = msg.content.toLowerCase();
    if (contentLowerCase === 'join') {
      shiritoriManager.addRealPlayer(locationId, userId);
      return true;
    } else if (contentLowerCase === 'bot leave') {
      shiritoriManager.setPlayerInactive(locationId, bot.user.id);
      return true;
    } else if (contentLowerCase === 'bot join') {
      shiritoriManager.addBotPlayer(locationId, bot.user.id);
      return true;
    } else if (contentLowerCase === 'leave') {
      shiritoriManager.setPlayerInactive(locationId, userId);
      return true;
    }
    return shiritoriManager.receiveInput(locationId, userId, msg.content, msg);
  },
};
