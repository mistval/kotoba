const {
  erisVersion, Permissions, ApplicationContexts, ApplicationIntegrationTypes,
} = require('monochrome-bot');
const monochromeVersion = require('monochrome-bot/package.json').version;

const erisVersionString = `Dysnomia v${erisVersion}`;
const nameString = 'K33#5261';
const otherDevsString = 'Alkhwarizm#7349, 💝 Amy 💝#0001, ernespa';

module.exports = {
  commandAliases: ['about'],
  uniqueId: 'about53463',
  cooldown: 30,
  shortDescription: 'Show some meta information about me.',
  canBeChannelRestricted: false,
  requiredBotPermissions: [Permissions.sendMessages],
  interaction: {
    compatibilityMode: true,
    contexts: [
      ApplicationContexts.GUILD,
      ApplicationContexts.BOT_DM,
    ],
    integrationTypes: [
      ApplicationIntegrationTypes.GUILD_INSTALL,
    ],
  },
  action(bot, msg) {
    return msg.channel.createMessage(`\`\`\`md
# Kotoba

[ CREATOR    ][ ${nameString} ]
[ OTHER DEVS ][ ${otherDevsString} ]
[ LIBRARY    ][ ${erisVersionString} ]
[ FRAMEWORK  ][ Monochrome v${monochromeVersion} ]

Need help, want to report a bug, make a suggestion, etc? Visit https://discord.gg/S92qCjbNHt

Kotoba's code is mostly open source (https://github.com/mistval/kotoba).
Kotoba runs on the monochrome bot framework (https://github.com/mistval/monochrome).

Kotoba uses data from the following sources:
    - Jisho (http://jisho.org)
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
