[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba

Kotoba is a project with several semi-independent pieces. Those are:

* [Kotoba Discord Bot](https://github.com/mistval/kotoba/tree/master/bot)
* [Kotobaweb.com frontend (React)](https://github.com/mistval/kotoba/tree/master/kotobaweb)
* [Kotobaweb API (Express)](https://github.com/mistval/kotoba/tree/master/api)

If you only care about the Discord bot you can stop reading now and go to [/bot](https://github.com/mistval/kotoba/tree/master/bot).

To deploy any of the projects independently, follow the instructions in their respective READMEs. To deploy them all together with Docker, follow the **Configuration** instructions in their respective READMEs and then run `docker-compose up` in this directory to build and deploy all projects in docker containers. Deploying on Linux is recommended however using Docker for Windows or Docker Toolbox should work on Windows. If using Docker Toolbox, you'll also need to use nginx for Windows or another proxy server application to proxy HTTP requests to the docker machine. You can also run the projects without using Docker (and should if you're doing development). Follow the instructions in the respective READMEs to do that.

In addition to the three main projects there are a few other directories:

* [/common](https://github.com/mistval/kotoba/tree/master/common) - Common code that is intended to be shared between node processes and browser.
* [/node-common](https://github.com/mistval/kotoba/tree/master/node-common) - Common code that is intended to be shared between node processes but not browser.
* [/nginx](https://github.com/mistval/kotoba/tree/master/nginx) - An nginx configuration for proxying HTTP requests to the [frontend](https://github.com/mistval/kotoba/tree/master/kotobaweb) and [API](https://github.com/mistval/kotoba/tree/master/api).

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
