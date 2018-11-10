const { EMBED_NEUTRAL_COLOR } = require('./../common/constants.js');

function createInstructions(prefix) {
  const INSTRUCTIONS_DESCRIPTION = `
If you enable Shiritori Forever in a channel, I will judge shiritori answers and keep score for a long-running shiritori game in that channel. I suggest enabling Shiritori Forever in a dedicated shiritori channel, otherwise it might be pretty annoying ;)

To enable Shiritori Forever, a server admin can say:

**${prefix}settings shiritoriforever enabled**

and then choose the channel to start the game in.

**${prefix}settings shiritoriforever disabled**

will likewise allow you to stop the game.
  `;

  return {
    embed: {
      title: 'Shiritori Forever',
      description: INSTRUCTIONS_DESCRIPTION,
      color: EMBED_NEUTRAL_COLOR,
    },
  };
}

/**
* Get a text file list of all servers the bot is in.
* Syntax: }servers
*/
module.exports = {
  commandAliases: ['shiritoriforever', 'sf'],
  botAdminOnly: false,
  shortDescription: 'Learn how to start or stop a long-running, no-time-limit game of shiritori in a channel.',
  hidden: false,
  uniqueId: 'shiritoriforever',
  action(bot, msg) {
    return msg.channel.createMessage(createInstructions(msg.prefix), undefined, msg);
  },
};
