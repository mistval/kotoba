[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba
A Discord bot for helping with language learning (especially Japanese)

Node 6.9.1+ recommended.

Runs on [monochrome bot framework](https://github.com/mistval/monochrome)

## Installation
```
git clone https://github.com/mistval/kotoba.git
cd kotoba
npm install -S --no-optional
```

## Configuration
For the bot to run, you must add your bot token to config.json.

Optionally, add Youtube and Google Translate API keys to kotoba/api_keys.js.

## Starting the bot
```
node ./monochrome.js
```
The bot should now be online. Invite it to your server and say k!help to see commands.

## Commands

```glsl
k!j (aliases: !j)
  # Search Jisho for an English or Japanese word. Example: k!j 少し
k!kanji (aliases: k!k)
  # Search for information about a kanji. Example: k!kanji 少
k!strokeorder (aliases: k!so)
  # Search for details about a kanji's strokes. Example: k!strokeorder 少
k!furigana (aliases: k!furi, k!f)
  # Render furigana for Japanese text. Example: k!furigana 吾輩は猫である
k!translate (aliases: k!t)
  # Use Google Translate to translate text. Example: k!translate 吾輩は猫である
k!quiz (aliases: k!q)
  # Start a quiz with the specified deck. Example: 'k!quiz n5'. 'k!quiz' lists decks, 'k!quiz stop' stops the quiz.
k!examples (aliases: k!ex)
  # Search Jisho for example sentences. Example: k!examples 少し
k!jukebox
  # I will pick a song for you (probably Touhou or Vocaloid) and post a Youtube link.
k!invite
  # Get a link to invite me to your server.
k!about
  # Show some meta information about me.
k!settings (aliases: k!s)
  # Server admins can use this command to see and configure my settings on their server.

Say k!help [command name] to see more help for a command. Example: k!help k!j
```

## Public bot

[The public version](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) has a couple extras that aren't here (Weblio search and much better definitions for the English vocabulary game)

## Help

[Support](https://discord.gg/f4Gkqku)
