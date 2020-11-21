const showRandomWord = require('./../discord/show_random_word.js');
const { Permissions } = require('monochrome-bot');

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
