'use strict'
const libVersion = require('../node_modules/eris/package.json').version;
const botVersion = require('../package.json').version;

module.exports = {
  commandAliases: ['k!about'],
  uniqueId: 'about53463',
  cooldown: 30,
  shortDescription: 'Show some meta information about me.',
  action(bot, msg, suffix) {
    return bot.createMessage(msg.channel.id, `\`\`\`md
# Kotoba

[ CREATOR ](K33#5261)
[ LIBRARY ](Eris v${libVersion})

Need help, want to report a bug, make a suggestion, etc? https://discordapp.com/invite/aXsaM9h

Kotoba's code is mostly open source (https://github.com/mistval/kotoba).
Kotoba runs on the monochrome bot framework (https://github.com/mistval/monochrome).

Kotoba uses data from the following sources:
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
