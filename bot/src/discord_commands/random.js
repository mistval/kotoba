const { Permissions } = require('monochrome-bot');
const showRandomWord = require('../discord/show_random_word.js');

module.exports = {
  commandAliases: ['random', 'r'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'randomword49390',
  requiredSettings: 'dictionary/display_mode',
  shortDescription: 'Search Jisho for a random word. You can specify a JLPT or 漢検 level if you want.',
  longDescription: 'Search Jisho for a random word. You can specify a JLPT or 漢検 level. The available levels are: N1, N2, N3, N4, N5, 10k, 9k, 8k, 7k, 6k, 5k, 4k, 3k, j2k, 2k, j1k, 1k',
  usageExample: '<prefix>random N3, <prefix>random 2k',
  requiredBotPermissions: [Permissions.embedLinks, Permissions.sendMessages],
  interaction: {
    compatibilityMode: true,
    options: [{
      name: 'level',
      description: 'A JLPT or Kanken level to choose a random word from.',
      type: 3,
      required: false,
      choices: [{
        name: 'JLPT N5',
        value: 'n5',
      }, {
        name: 'JLPT N4',
        value: 'n4',
      }, {
        name: 'JLPT N3',
        value: 'n3',
      }, {
        name: 'JLPT N2',
        value: 'n2',
      }, {
        name: 'JLPT N1',
        value: 'n1',
      }, {
        name: 'Kanji Kentei 10 Kyuu',
        value: '10k',
      }, {
        name: 'Kanji Kentei 9 Kyuu',
        value: '9k',
      }, {
        name: 'Kanji Kentei 8 Kyuu',
        value: '8k',
      }, {
        name: 'Kanji Kentei 7 Kyuu',
        value: '7k',
      }, {
        name: 'Kanji Kentei 6 Kyuu',
        value: '6k',
      }, {
        name: 'Kanji Kentei 5 Kyuu',
        value: '5k',
      }, {
        name: 'Kanji Kentei 4 Kyuu',
        value: '4k',
      }, {
        name: 'Kanji Kentei 3 Kyuu',
        value: '3k',
      }, {
        name: 'Kanji Kentei Jun2 Kyuu',
        value: 'j2k',
      }, {
        name: 'Kanji Kentei 2 Kyuu',
        value: '2k',
      }, {
        name: 'Kanji Kentei Jun1 Kyuu',
        value: 'j1k',
      }, {
        name: 'Kanji Kentei 1 Kyuu',
        value: '1k',
      }],
    }],
  },
  action(bot, msg, suffix, monochrome) {
    const suffixLowerCase = suffix.toLowerCase();
    monochrome.updateUserFromREST(msg.author.id).catch(() => {});

    return showRandomWord(
      suffixLowerCase,
      msg.channel,
      monochrome,
      msg,
    );
  },
};
