'use strict'
const config = require('./../config.json');

module.exports = {
  commandAliases: [']help', ']h'],
  cooldown: 5,
  serverAdminOnly: true,
  action(bot, msg, suffix) {
    let message = `\`\`\`glsl
// Here are my server admin commands!
// You must have a role called '${config.serverAdminRoleName}' in order to run these (or be a bot admin).
]bancommand [command] (short: ]bc)
\t# Ban a command from this server. For example: ]bancommand bot!ping
]allowcommand [command] [channel1] [channel2] [channelx] ... (short: ]ac)
\t# Allow a command only in certain channels. For example: ]allowcommand bot!nsfw #nsfw1 #nsfw2
]unrestrictcommand [command] (short: ]uc)
\t# Allow a command in all channels. For example: ]unrestrictcommand bot!nsfw
\`\`\``;
    return msg.channel.createMessage(message);
  },
};
