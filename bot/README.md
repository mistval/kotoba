[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba

A Discord bot for helping with Japanese learning.

Uses [monochrome bot framework](https://github.com/mistval/monochrome) and [Eris](https://github.com/abalabahaha/eris).

## Configuration

After cloning the repo, create a subdirectory of this directory called **config** and a file inside of it called **config.json**. It contains your bot token and bot admin IDs. It should look like this:

```json
{
  "botToken": "your_bot_token_here",
  "botAdminIds": ["your_user_id_here"]
}
```

Also in the **config** directory, create a file called **api_keys.json**. It contains your API keys for external services. You can leave the keys as empty strings (some features won't work though), but you must create the file as shown below:

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

## Running for production (Docker)

In the **directory above this one, the root directory of the repo** run:

```
docker-compose up kotoba-bot mongo-readwrite
```

The bot will take some minutes to build and then will come online.

## Running for development (not Docker)

Instructions below are for Ubuntu Linux. Last I checked, Kotoba does also run fine on Windows, but I may or may not be able to help you with that.

You must have **cairo** and **pango** installed (for image rendering for the quiz and furigana commands). You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages). These must be installed before you run npm install. If you already ran npm install, just delete your node_modules, install cairo and pango, and npm install again. *You can skip this if you're not going to use or work on the quiz or furigana commands.*

You must also have **MongoDB** installed and listening on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/). *You can skip this if you're not going to use or work on the pronounce command or shiritori.*

After you've installed those run:

```
npm install
npm run buildquiz // You can skip this if you're not going to use the quiz feature.
npm run buildshiritori // You can skip this if you're not going to use the shiritori features.
npm run buildpronunciation // You can skip this if you're not going to use the pronounce command.
```
(If you're going to use all of those things, you can do **npm run buildall** instead of the three separate build commands)

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

View the list of commands [here](https://kotobaweb.com/bot).

## Public bot

[The public version](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) has a few things that aren't here.
