[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba

A Discord bot for helping with language learning (especially Japanese)

Runs on [monochrome bot framework](https://github.com/mistval/monochrome)

## Help Wanted

I'd love to get help from other developers, and there is plenty to do. If you're interested, let me know, you can contact me in my [Discord server](https://discord.gg/f4Gkqku). New code should be written using AirBnB style guidelines and functional coding styles should be preferred. New code should be as platform-independent (that is, Discord-independent) as possible, and the platform-independent code should live in ./src/common while Discord code should live in ./src/discord_* directories. (Older code is being incrementally brought up to these standards)

## Installation

Installation instructions below are for Ubuntu Linux.

```
sudo apt install docker-compose
git clone https://github.com/mistval/kotoba.git
cd kotoba
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
sudo docker-compose up
```

The bot will take 5-10 minutes to build and then will come online.

## Commands

View the list of commands [here](http://kotobaweb.com/bot).

## Public bot

[The public version](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) has a few things that aren't here.

## Help

[Support](https://discord.gg/f4Gkqku)
