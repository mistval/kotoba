[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba
A Discord bot for helping with language learning (especially Japanese)

Node 6.9.1+ recommended.

Runs on [monochrome bot framework](https://github.com/mistval/monochrome)

## Help Wanted

I'd love to get help from other developers, and there is plenty to do. If you're interested, let me know, you can contact me in my [Discord server](https://discord.gg/f4Gkqku). New code should be written using AirBnB style guidelines and functional coding styles should be preferred. New code should be as platform-independent (that is, Discord-independent) as possible, and the platform-independent code should live in ./src/common while Discord code should live in ./src/discord_* directories. (Older code is being incrementally brought up to these standards)

## Installation

You must have **cairo** and **pango** installed (for image rendering for the quiz and furigana commands). You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages). These must be installed before you run npm install. If you already ran npm install, just delete your node_modules, install cairo and pango, and npm install again.

You must also have **MongoDB** installed and listening on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/).

You should also install the fonts in the /fonts directory. If you don't do this, the quiz and furigana commands might not use the fonts they are configured to use (and if you don't have any CJK fonts installed, they might just show boxes instead of Japanese characters).

After you've done all that:

```
git clone https://github.com/mistval/kotoba.git
cd kotoba
npm install
npm run buildall
```

## Configuration
You must create a file in the root directory called **config.json**. It contains your bot token and bot admin IDs. It should look like this:

```json
{
  "botToken": "your_bot_token_here",
  "botAdminIds": ["your_user_id_here"]
}
```

Optionally, add API keys to ./api_keys.js. Some commands require API keys to work.

## Starting the bot
```
node .
```
The bot should now be online. Invite it to your server and say k!help to see commands. You're good to go.

## Commands

```
k!jisho (aliases: k!j)
    # Search Jisho for an English or Japanese word. Example: k!j 少し
k!jn
    # The same as k!jisho, but without command buttons, in case you don't like them! Example: k!jn 少し
k!kanji (aliases: k!k)
    # Search for information about a kanji. Example: k!kanji 少
k!shiritori (aliases: k!st, k!sh)
    # Start a game of shiritori in this channel.
k!strokeorder (aliases: k!s, k!so)
    # Search for details about a kanji's strokes. Example: k!strokeorder 少
k!furigana (aliases: k!furi, k!f)
    # Render furigana for Japanese text. Example: k!furigana 吾輩は猫である
k!quiz (aliases: k!q)
    # See how to start a quiz in this channel.
k!examples (aliases: k!ex)
    # Search Jisho for example sentences. Example: k!examples 少し
k!pronounce (aliases: k!p)
    # Look up information about how to pronounce a Japanese word. Example: k!pronounce 瞬間
k!random (aliases: k!r)
    # Search Jisho for a random word. You can specify a JLPT or 漢検 level if you want. Example: 'k!random N3', 'k!random 2k'
k!deconjugate (aliases: k!d)
    # Deconjugate a Japanese verb. Example: k!deconjugate 食べさせられたかった
k!translate (aliases: k!t)
    # Use Google Translate to translate text. Example: k!translate 吾輩は猫である
k!jukebox
    # I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link.
k!invite
    # Get a link to invite me to your server.
k!about
    # Show some meta information about me.
k!settings
    # Configure my settings.

Say k!help [command name] to see more help for a command. Example: k!help k!jisho
```

## Public bot

[The public version](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) has a few things that aren't here.

## Help

[Support](https://discord.gg/f4Gkqku)
