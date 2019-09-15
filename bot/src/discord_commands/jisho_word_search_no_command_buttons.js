const jishoSearch = require('./../discord/jisho_search.js');
const { throwPublicErrorInfo } = require('./../common/util/errors.js');

module.exports = {
  commandAliases: ['jn'],
  canBeChannelRestricted: true,
  cooldown: 3,
  uniqueId: 'jishowordjn64054',
  shortDescription: 'The same as <prefix>jisho, but without command buttons, in case you don\'t like them!',
  longDescription: 'Search Jisho for an English or Japanese word. Tip: sometimes Jisho will interpret your English search term as a Japanese word written in romaji. To force it to interpret your search term as English, put quotes around your search term. Example: <prefix>j "gone"\n\nThere are two display modes. The default is \'big\' (unless your server admins have changed it). There is also \'small\'. Try both:\n\n<prefix>j 少し --big\n<prefix>j 少し --small\n\nServer admins can change the default display mode by using the <prefix>settings command.',
  usageExample: '<prefix>jn 少し',
  async action(bot, msg, suffix) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Jisho', `Say **${prefix}jn [word]** to search for words on Jisho.org. For example: **${prefix}jn 瞬間**. Say **${prefix}help jisho** for more help.`, 'No suffix');
    }

    const result = await jishoSearch.createOnePageBigResultForWord(suffix);
    return msg.channel.createMessage(result, null, msg);
  },
};
