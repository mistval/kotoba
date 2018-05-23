const libVersion = require('eris/package.json').version;

module.exports = {
  commandAliases: ['k!about'],
  uniqueId: 'about53463',
  cooldown: 30,
  shortDescription: 'Show some meta information about me.',
  canBeChannelRestricted: false,
  action(erisBot, msg) {
    return msg.channel.createMessage(`\`\`\`md
# Kotoba

[ CREATOR ](K33#5261)
[ LIBRARY ](Eris v${libVersion})

Need help, want to report a bug, make a suggestion, etc? Visit https://discordapp.com/invite/zkAKbyJ

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
    - Bing news (http://bing.com/news)

Many of the quiz decks come from https://github.com/darkgray1981/kanjiquizbot\`\`\``, null, msg);
  },
};
