# monochrome
A flexible Discord bot core.
Node 6.9.1+ recommended.

## Installation
```
git clone https://github.com/mistval/monochrome.git
cd monochrome
npm install -S --no-optional
```

## Basic Configuration
<ol>
<li>Create an application in <a href='https://discordapp.com/developers/applications/me'>Discord applications</a>. (or use an existing bot token)</li>
<li>In your application's settings, click "Create a Bot User" and confirm.
<li>Enter your new bot's Token into monochrome/config.json's botToken field.</li>
<li>User your application's Client ID to add your bot to your server. Substitute the Client ID into this link: https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot</li>
</ol>

## Starting the bot
```
node ./monochrome.js
```
Your bot should now appear as online in your server. Try bot!help to get a response, and see the default commands.

## Adding commands
Here is a simple hello world command:
```js
module.exports = {
  commandAliases: ['bot!hello', 'bot!hi'], // Aliases for the command
  canBeChannelRestricted: true, // If true, server admins can restrict the usage of this command in their server.
  uniqueId: 'hello4859', // Can be anything, as long as it's unique, and you shouldn't change it. Only required if canBeChannelRestricted is true.
  serverAdminOnly: false, // If true, only server admins can run this command.
  botAdminOnly: false, // If true, only bot admins can run this command.
  onlyInServer: false, // If true, this command cannot be used in DMs, only in servers.
  cooldown: 3, // A cooldown in seconds
  action(bot, msg, suffix) {
    bot.createMessage(msg.channel.id, 'Hello World!');
  },
};
```

Save that as helloworld.js and drop it into the monochrome/commands directory. Start your bot and say bot!hello or bot!hi to get a response. (If your bot is already running, you can use the }reload command to reload commands)

A command can return a promise (if it rejects, or fulfills with an error string, that will be logged), or it can return an error string to log immediately, or nothing.

## Message Processors
A message processor is like a more flexible command. It can choose whether to respond to any input. Here is a simple message processor:
```js
module.exports = {
  name: 'Palindrome',
  action: (bot, msg) => {
    let text = msg.content;
    let textBackwards = text.split('').reverse().join('');
    if (text === textBackwards) {
      bot.createMessage(msg.channel.id, 'That\'s a palindrome!');
      return true;
    } else {
      return false;
    }
  }
};
```
Save that as palindrome.js and drop it into the monochrome/message_processors directory. Start your bot and say 'racecar', 'hannah', etc to get a response.

If a message processor agrees to process the input, it should return true. If it does not agree to process the input, it should return false.
If it returns a string, that is treated like true, and the string is logged as an error. If it returns a promise, that is treated like true, and the promise is resolved.

## Navigations
A navigation is a message that the bot edits in response to reactions, allowing a user to browse through pages of information.

![Navigation gif](https://github.com/mistval/monochrome/blob/master/nav.gif "Navigation gif")

See /commands/navigation.js for the code behind the above example.

## Further Configuration
monochrome/config.json:
```js
{
  "botToken": "", // Must be a valid bot token.
  "botAdminIds": [""], // An array of user IDs for the bot admins (you can use Discord's developer mode to find any user's ID).
  "discordBotsDotOrgAPIKey": "", // If you have an API key from discordbots.org, insert it here and stats will be periodically sent.
  "logsDirectory": "./logs", // The directory to write logs to (can be an empty string). Logs are also written to the console.
  "useANSIColorsInLogFiles": true, // Whether ANSI color codes should be used in the log file or not. If you're going to be cat'ing log files in a console, you probably want this to be true. If you're going to be opening logs in notepad, you may want to set this to false.
  "serverAdminRoleName": "monochrome", // Users with a role with this name will be considered server admins able to run server admin commands.
  "genericErrorMessage": "Oh no, that command had an error! Please tell my owner to check the logs!", // If a command errors and that error escapes into core code, this message will be sent to the channel.
  "genericDMReply": "Hi <user>, bot!help to see my commands!", // The bot will reply with this when DM'd, if the DM doesn't contain a command. <user> is replaced with the user's name.
  "genericMentionReply": "Hi <@user>, say bot!help to see my commands!", // The bot will reply like this when mentioned. <@user> mentions the user.
  "statusRotation": [ // An array of statuses to rotate through.
    "bot!help for commands!",
    "eating chicken",
    "buying games on steam"
  ],
  "statusRotationIntervalInSeconds": 600 // How often to change status.
}
```

## Persistence
Persistence powered by node-persist is built in. See the included commands: addquote.js and getrandomquote.js for an example. Or look at the core documentation for ./core/persistence.js

## Logging
The Logger singleton can be used for logging.
```js
const Logger = require('./../core/Logger.js'); // Path relative to the monochrome/commands directory.

Logger.logSuccess('TITLE', 'message');
Logger.logFailure('TITLE', 'message', errorObjectIfThereIsOne);
```


## Core Documentation
JSDoc can be used to generate documentation for the core classes.
```
npm install -g jsdoc
sh ./generate_documentation.sh
```
And then open monochrome/documentation/index.html.

The core code (mostly) complies with Google's JavaScript coding conventions, with the exception of its maximum line length limit. Code style in the core classes can be checked with ```sh ./style_checks.sh```

## Tests
```
npm install -g nyc
npm test
```

## Sample bot

Add my bot [Kotoba](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) to your server to see an example of a bot running on monochrome.

## Help

[Support](https://discord.gg/f4Gkqku)