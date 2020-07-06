const { erisVersion, Permissions } = require('monochrome-bot');
const monochromeVersion = require('monochrome-bot/package.json').version;

const erisVersionString = `Eris v${erisVersion}`;
const nameString = 'K33#5261';
const otherDevsString = 'Alkhwarizm#7349 💝 Foxie 💝#0001';

module.exports = {
  commandAliases: ['about'],
  uniqueId: 'about53463',
  cooldown: 30,
  shortDescription: 'Show some meta information about me.',
  canBeChannelRestricted: false,
  requiredBotPermissions: [Permissions.sendMessages],
  action(bot, msg) {
    return msg.channel.createMessage(`\`\`\`md
# Kotoba

[ CREATOR    ][ ${nameString} ]
[ OTHER DEVS ][ ${otherDevsString} ]
[ LIBRARY    ][ ${erisVersionString} ]
[ FRAMEWORK  ][ Monochrome v${monochromeVersion} ]

Need help, want to report a bug, make a suggestion, etc? Visit https://discordapp.com/invite/zkAKbyJ

Kotoba's code is mostly open source (https://github.com/mistval/kotoba).
Kotoba runs on the monochrome bot framework (https://github.com/mistval/monochrome).

Kotoba uses data from the following sources:
    - Jisho (http://jisho.org)
    - Jibiki (https://jibiki.app)
    - Weblio (http://weblio.jp/)
    - Google Translate (https://translate.google.com/)
    - KanjiVG (http://kanjivg.tagaini.net/)
    - Tanos (http://www.tanos.co.uk/)
    - Youtube (http://youtube.com)
    - Forvo (https://forvo.com/)
    - Merriam Webster Dictionary (https://www.merriam-webster.com)
    - Oxford Dictionary & Thesaurus (https://www.oxforddictionaries.com/)
    - Wiktionary (https://ja.wiktionary.org)
    - Princeton WordNet (http://compling.hss.ntu.edu.sg/wnja/index.en.html)\`\`\``, null, msg);
  },
};
