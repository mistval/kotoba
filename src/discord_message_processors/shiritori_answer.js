const shiritoriManager = require('shiritori');

module.exports = {
  name: 'Shiritori Answer',
  action: (bot, msg, monochrome) => {
    let locationId = msg.channel.id;
    if (!shiritoriManager.gameExists(locationId)) {
      return false;
    }

    let userId = msg.author.id;
    let userName = msg.author.username;
    let contentLowerCase = msg.content.toLowerCase();
    if (contentLowerCase === 'join') {
      return shiritoriManager.addRealPlayer(locationId, userId);
    } else if (contentLowerCase === 'bot leave') {
      return shiritoriManager.setPlayerInactive(locationId, bot.user.id);
    } else if (contentLowerCase === 'bot join') {
      return shiritoriManager.addBotPlayer(locationId, bot.user.id);
    } else if (contentLowerCase === 'leave') {
      return shiritoriManager.setPlayerInactive(locationId, userId);
    } else {
      return shiritoriManager.receiveInput(locationId, userId, msg.content);
    }
  }
};
