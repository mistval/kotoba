'use strict'
const libVersion = require('../node_modules/eris/package.json').version;
const botVersion = require('../package.json').version;

module.exports = {
  commandAliases: ['k!about'],
  cooldown: 30,
  action(bot, msg, suffix) {
    return bot.createMessage(msg.channel.id, `\`\`\`md
# Kotoba

[ CREATOR ](K33#5261)
[ LIBRARY ](Eris v${libVersion})

Kotoba was designed for language learning Discord servers.
It runs on the monochrome bot framework (https://github.com/mistval/monochrome).

It uses data from the following sources:
    - Jisho (http://jisho.org)
    - KanjiAlive (https://kanjialive.com/)
    - Weblio (http://ejje.weblio.jp/)
    - Google Translate (https://translate.google.com/)
    - KanjiVG (http://kanjivg.tagaini.net/)
    - Tanos (http://www.tanos.co.uk/)
    - Youtube (you know where)
    - Glosbe Dictionary (https://glosbe.com/)

Many of the quiz decks come from https://github.com/darkgray1981/kanjiquizbot\`\`\``);
  },
};
