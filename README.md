[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba

Kotoba is a project with several semi-independent pieces. Those are:

* [Kotoba Discord Bot](https://github.com/mistval/kotoba/tree/master/bot)
* [Kotobaweb.com frontend (React)](https://github.com/mistval/kotoba/tree/master/kotobaweb)
* [Kotobaweb API (Express)](https://github.com/mistval/kotoba/tree/master/api)

In addition to the three main projects there are a few other directories:

* [/common](https://github.com/mistval/kotoba/tree/master/common) - Common code that is intended to be shared between node processes and browser.
* [/node-common](https://github.com/mistval/kotoba/tree/master/node-common) - Common code that is intended to be shared between node processes but not browser.
* [/nginx](https://github.com/mistval/kotoba/tree/master/nginx) - An nginx configuration for proxying HTTP requests to the [frontend](https://github.com/mistval/kotoba/tree/master/kotobaweb) and [API](https://github.com/mistval/kotoba/tree/master/api).
* [/backup](https://github.com/mistval/kotoba/tree/master/backup) - Tools for backing up user data to Google Cloud Storage.

## Configuration

After cloning the repo, fill out [config_sample.js](https://github.com/mistval/kotoba/blob/master/config_sample.js) and rename it to **config.js**. You only have to fill out the sections for the components you want to run. For example if you're only going to run the bot, you only have to fill out the **bot** section.

## Self-hosting the bot

After following the configuration instructions:

```sh
sudo apt install docker docker-compose
docker-compose up kotoba-bot mongo_readwrite
```

The bot will take some time to build and should then come online. Note that it will be missing some fonts and features that are not in this repo. These instructions are for Ubuntu Linux.

## Developing

### Discord bot

```sh
cd ./bot
npm start
```

The bot will start and come online. Some commands won't work. There are additional steps required to make certain commands work:

* Quiz command
    1. In the ./bot directory, run `npm run buildquiz`.
    2. Install **cairo** and **pango**. You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages).
    3. Install CJK fonts. Most of the fonts Kotoba uses are provided [here](https://github.com/mistval/kotoba/tree/master/bot/fonts).
* Furigana command
    1. Install **cairo** and **pango**. You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages).
    2. Install CJK fonts. Most of the fonts Kotoba uses are provided [here](https://github.com/mistval/kotoba/tree/master/bot/fonts).
* Pronunciation command
    1. Install **MongoDB** and start it on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/).
    2. In the ./bot directory, run `npm run buildpronunciation`.
* Shiritori command
    1. Install **MongoDB** and start it on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/).
    2. In the ./bot directory, run `npm run shiritori`.

### KotobaWeb

1. Install **cairo** and **pango**. You can install them using the instructions for your operating system [here](https://github.com/Automattic/node-canvas/wiki/_pages).
2. Install CJK fonts. Most of the fonts Kotoba uses are provided [here](https://github.com/mistval/kotoba/tree/master/bot/fonts).
3. Install **MongoDB** and start it on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/).

```sh
cd ./api
npm run buildall
npm startdev_nix # Or on Windows: npm startdev_win

cd ../kotobaweb
npm start
```

## Help

[Support](https://discord.gg/f4Gkqku)

## Third party links

Data from the following third parties has been used in Kotoba.

[Jisho.org](https://jisho.org/about)  
[Princeton University Japanese WordNet](http://compling.hss.ntu.edu.sg/wnja/index.en.html)  
[KanjiVG](http://kanjivg.tagaini.net/)  
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
