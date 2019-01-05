[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba

A Discord bot for helping with language learning (especially Japanese)

Runs on [monochrome bot framework](https://github.com/mistval/monochrome)

## Help Wanted

I'd love to get help from other developers, and there is plenty to do. If you're interested, let me know, you can contact me in my [Discord server](https://discord.gg/f4Gkqku). New code should be written using AirBnB style guidelines and functional coding styles should be preferred. New code should be as platform-independent (that is, Discord-independent) as possible, and the platform-independent code should live in ./src/common while Discord code should live in ./src/discord_* directories. (Older code is being incrementally brought up to these standards)

## Installation and running for production (docker)

Installation instructions below are for Ubuntu Linux.

Run:

```
sudo apt install docker docker-compose
git clone https://github.com/mistval/kotoba.git
cd kotoba
```

Then create a directory in the root directory called **config** and a file inside of it called **config.json**. It contains your bot token and bot admin IDs. It should look like this:

```json
{
  "botToken": "your_bot_token_here",
  "botAdminIds": ["your_user_id_here"]
}
```

Also in the **config** directory, create a file called **api_keys.json**. It contains your API keys for external services. You can leave the keys blank, but you must create the file as shown below:

```json
{
  "YOUTUBE": "",
  "GOOGLE_TRANSLATE": "",
  "AZURE_NEWS": "",
  "FORVO": "",
  "WEBSTER_CTH": "",
  "OXFORD_APP_ID": "",
  "OXFORD_API_KEY": ""
}
```

Run:

```
sudo docker-compose up
```

The bot will take 5-10 minutes to build and then will come online.

## Installation and running for development

Instructions below are for Ubuntu Linux. Last I checked, Kotoba does also run fine on Windows, but I may or may not be able to help you with that.

You must have **cairo** and **pango** installed (for image rendering for the quiz and furigana commands). You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages). These must be installed before you run npm install. If you already ran npm install, just delete your node_modules, install cairo and pango, and npm install again.

You must also have **MongoDB** installed and listening on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/).

After you've installed those run:

```
git clone https://github.com/mistval/kotoba.git
cd kotoba
npm install
npm run buildall
```

Then create a directory in the root directory called **config** and a file inside of it called **config.json**. It contains your bot token and bot admin IDs. It should look like this:

```json
{
  "botToken": "your_bot_token_here",
  "botAdminIds": ["your_user_id_here"]
}
```

Also in the **config** directory, create a file called **api_keys.json**. It contains your API keys for external services. You can leave the keys blank, but you must create the file as shown below:

```json
{
  "YOUTUBE": "",
  "GOOGLE_TRANSLATE": "",
  "AZURE_NEWS": "",
  "FORVO": ""
}
```

You should also install the fonts in the /fonts directory. If you don't do this, the quiz and furigana commands might not use the fonts they are configured to use (and if you don't have any CJK fonts installed, they might just show boxes instead of Japanese characters).

Finally, to start the bot run:

```
npm start
```

## Fonts

Due to licensing restrictions on redistribution, some of the fonts that public Kotoba uses are not included in the Github repo. You should be able to find them by Googling. Fonts not in this repo include:

* PopRumCute
* CP_Revenge
* Genkaimincho
* kurobara-cinderella

## Commands

View the list of commands [here](http://kotobaweb.com/bot).

## Public bot

[The public version](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) has a few things that aren't here.

## Help

[Support](https://discord.gg/f4Gkqku)

## Third party licenses

### Dictionaries

[Princeton University Japanese WordNet License](http://compling.hss.ntu.edu.sg/wnja/index.en.html)
