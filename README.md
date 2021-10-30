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
* [/worker](https://github.com/mistval/kotoba/tree/master/worker) - A worker process for doing some heavy lifting for other processes whose event loops should not be blocked.
* [/cloud_functions](https://github.com/mistval/kotoba/tree/master/cloud_functions) - The code for HTTP endpoints that can be deployed as cloud functions and which some bot commands rely on.
* [/resources](https://github.com/mistval/kotoba/tree/master/resources) - Dictionaries, fonts, images, and other non-code assets.

## Configuration

After cloning the repo (recommend cloning with `--depth=1`), fill out [config/config_sample.js](https://github.com/mistval/kotoba/blob/master/config/config_sample.js) and rename it to **config.js**. Most of the configuration is optional, but some features may not work right, or not at all, if they are not configured.

## Developing

**Node v16 is recommended**

### Discord bot

After following the **Configuration** instructions above:

Install **MongoDB** and start it on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/). Or, use Docker: `docker run -p 27017:27017 mongo`. Then:

```sh
cd ./bot
npm ci
npm run buildresources # this takes a few minutes
npm start
```

The bot will start and come online. The `npm run buildresources` command generally only needs to be run once (unless you change quiz data or such).

VS Code is recommended for development. This repo contains a VS Code `launch.json` with a `Launch bot` configuration for debugging in VS Code.

### KotobaWeb

Install **MongoDB** and start it on port 27017 (the default port). You can install it using the instructions for your operating system [here](https://docs.mongodb.com/manual/installation/). Then:

```sh
cd ./api
npm ci
npm run buildall
npm start

cd ../kotobaweb
npm ci
npm start
```

The API will start on port 80 and the React dev server will start on port 3001.

### Worker process

The worker process handles some heavy lifting so that the event loop doesn't have to block in the bot or API. The bot and API communicate with it via HTTP. It doesn't do much at the moment, and most features work without it, so you can probably ignore it until you're working with a feature that requires it and you notice that HTTP requests to it are failing.

```
cd ./worker
npm ci
npm start
```

## Self-hosting the bot

While it is possible to self-host Kotoba, there are some caveats and some of the setup is not straightforward. Before continuing, first consider why you want to self-host. Could you PR your desired features to this repo instead, so they can be added to public Kotoba? I encourage you to take that route if you can. Otherwise, read on.

After following the **Configuration** instructions higher up in this readme:

```sh
sudo apt install docker docker-compose
sudo docker-compose up kotoba-bot kotoba-worker mongo_readwrite
```

The bot will take some time to build and should then come online. Most things will work. However there is additional setup required for certain features:

### Furigana and Hispadic commands

These commands call out to HTTP endpoints that you need to host yourself one way or another. This is done mainly to reduce RAM usage on the main bot server. I use Google Cloud Platform to host these, they have a very generous free tier. The code you need to deploy is in the **cloud_functions** directory in this repo.

For the furigana command:
1. Create a new cloud function in the GCP console.
2. Set the name to something unguessable.
3. Set the trigger to HTTP.
4. Check off "Allow unauthenticated invocations".
5. Set the runtime to Node.js (version probably doesn't matter)
6. Use the inline editor and paste in the index.js and package.json code.
7. Set the "function to execute" to getFurigana.
8. Set maximum function instances to 1.
9. Deploy the function, get the URL of the HTTP endpoint, and add it to config/config.js.

For the hispadic command:
1. Create a new cloud function in the GCP console.
2. Set the name to something unguessable.
3. Set the trigger to HTTP.
4. Check off "Allow unauthenticated invocations".
5. Set the runtime to Node.js (version probably doesn't matter)
6. Zip the index.js, hispadic.js, and package.json files in cloud_functions/hispadic, and use the "Zip upload" option to upload it to cloud storage (it's too big for the inline editor)
7. Set the "function to execute" to search.
8. Set maximum function instances to 1.
9. Deploy the function, get the URL of the HTTP endpoint, and add it to config/config.js.

### Fonts

Most of the fonts in public Kotoba are not in this repo, due to their license conditions. But you can add whatever fonts you want. Just put them in resources/fonts and write meta.json files to describe them. Follow the example of the fonts that are already there.

### Other missing functionality

Some quiz decks are not in this repo, and some commands or other functionality also may not be, due to distribution and copyright concerns. If you self-host Kotoba, you will have to survive without some things.

## Help

[Support](https://discord.gg/S92qCjbNHt)

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
