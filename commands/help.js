'use strict'
module.exports = {
  commandAliases: ['bot!help', 'bot!h'],
  cooldown: 5,
  uniqueId: 'help5489',
  action(bot, msg, suffix) {
    let message = `\`\`\`glsl
// Here are my commands!
bot!ping (short: bot!p)
\t# You say bot!ping, I say Pong!
bot!addquote [your words of wisdom] (short: bot!aq)
\t# Add a quote to my database!
bot!getquote (short: bot!gq)
\t# Get a random quote!
bot!navigation (short: bot!nav)
\t# Navigation demonstration!
bot!about
\t# Find out more about me!
]help (short: ]h)
\t# Help for server admins!
}help (short: }h)
\t# Help for bot admins!
\`\`\``;
    return msg.channel.createMessage(message);
  },
};
