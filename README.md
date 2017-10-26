# kotoba
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
k!j [word] (short: !j)
  # Search Jisho for an English or Japanese word. For example: k!j 家族
k!quiz [deck] (short: k!q)
  # Start a quiz with the specified deck. k!quizdecks lists available decks. 'k!quiz stop' stops the quiz.
k!kanji [kanji] (short: k!k)
  # Search for information about a Kanji. For example: k!kanji 雨
k!strokeorder [kanji] (short: k!so)
  # Search for details about a Kanji's strokes. For example: k!strokeorder 雨
k!gt [text]
  # Use google translate to translate text. For example: k!gt 日本
k!jukebox
  # I will choose a song for you (probably Touhou or Vocaloid)
k!examples [word] (short: k!ex)
  # Search Jisho for examples of a word.
k!invite
  # Get a link to invite me to your server :)
k!help more
  # Show advanced help
k!about
  # See some meta information about me.
```

## Public bot

[The public version](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) has a couple extras that aren't here (Weblio search and much better definitions for the English vocabulary game)
