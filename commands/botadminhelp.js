'use strict'
module.exports = {
  commandAliases: ['}help', '}h'],
  cooldown: 5,
  action(bot, msg, suffix) {
    let message = `\`\`\`glsl
// Here are my bot admin commands!
// Your user ID must be listed in config.json in order to run these.
}setavatar [image url]
\t# Set my avatar.
}servers
\t# List the servers that I'm in.
}delete [channel id] [message id] (short: }d)
\t# Delete a message.
}broadcast [channel id] [announcement] (short: }b)
\t# Make me say something.
}reload
\t# Reload my commands.
}eval [javascript code]
\t# Evaluate arbitrary code. Use wisely.
\`\`\``;
    return msg.channel.createMessage(message);
  },
};
