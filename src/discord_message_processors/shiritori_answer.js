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
    } else {
      return shiritoriManager.receiveInput(locationId, userId, msg.content, msg);
    }
  }
};
