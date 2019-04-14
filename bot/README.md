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

Run:

```
sudo docker-compose up
```

The bot will take 5-10 minutes to build and then will come online.

## Installation and running for development

Instructions below are for Ubuntu Linux. Last I checked, Kotoba does also run fine on Windows, but I may or may not be able to help you with that.

You must have **cairo** and **pango** installed (for image rendering for the quiz and furigana commands). You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages). These must be installed before you run npm install. If you already ran npm install, just delete your node_modules, install cairo and pango, and npm install again. *You can skip this if you're not going to use or work on the quiz or furigana commands.*

You must also have **MongoDB** installed and listening on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/). *You can skip this if you're not going to use or work on the pronounce command or shiritori.*

After you've installed those run:

```
git clone https://github.com/mistval/kotoba.git
cd kotoba
npm install
npm run buildall // You can skip this if you're not going to use quiz, pronounce, furigana, or shiritori commands. This takes a while.
```

Then create a directory in the root directory called **config** and a file inside of it called **config.json**. It contains your bot token and bot admin IDs. It should look like this:

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

## Third party links

Data from the following third parties has been used in Kotoba.

[Jisho.org](https://jisho.org/about)
[Princeton University Japanese WordNet](http://compling.hss.ntu.edu.sg/wnja/index.en.html)
[KanjiVG](http://kanjivg.tagaini.net/)
[Glosbe Dictionary](https://glosbe.com/)
[Forvo](https://forvo.com/)
[Merriam-Webster](https://www.merriam-webster.com)
[Oxford Dictionaries](https://www.oxforddictionaries.com/)
[Japanese Wiktionary](https://ja.wiktionary.org)
[EDICT](http://www.edrdg.org/jmdict/edict.html)
[ENAMDICT](https://www.edrdg.org/enamdict/enamdict_doc.html)
[Kanjimaji](https://github.com/maurimo/kanimaji)
[Google Translate](https://translate.google.com/)
[YouTube](https://www.youtube.com/)
[Jonathan Waller's site](http://www.tanos.co.uk/)

In addition various people have contributed quiz data and are credited in the relevant quiz descriptions.

## Child libraries

The following other codebases were written in the course of this project:

* **fpersist** - On disk persistence with safer writes. [GitHub](https://github.com/mistval/fpersist) [NPM](https://www.npmjs.com/package/fpersist)
* **unofficial-jishi-api** - Encapsulates the official Jisho.org API and also provides kanji and example search. [GitHub](https://github.com/mistval/unofficial-jisho-api) [NPM](https://www.npmjs.com/package/unofficial-jisho-api)
* **render-furigana** - Render Japanese text with furigana into a PNG buffer. [GitHub](https://github.com/mistval/render-furigana) [NPM](https://www.npmjs.com/package/render-furigana)
* **monochrome** - A flexible node.js Discord bot core based on Eris. [GitHub](https://github.com/mistval/monochrome) [NPM](https://www.npmjs.com/package/monochrome)
* **jp-verb-deconjugator** - Unconjugate conjugated Japanese verbs. [GitHub](https://github.com/mistval/jp-verb-deconjugator) [NPM](https://www.npmjs.com/package/jp-verbs)
* **shiritori** - A backend engine for playing shiritori. [GitHub](https://github.com/mistval/shiritori) [NPM](https://www.npmjs.com/package/shiritori)
* **array-on-disk** - A module for storing and accessing large arrays on disk. [GitHub](https://github.com/mistval/array-on-disk) [NPM](https://www.npmjs.com/package/disk-array)
