'use strict'
const reload = require('require-reload')(require);
const prettyLanguageForLanguageCode = reload('./../kotoba/language_code_maps.js').prettyLanguageForGoogleLanguageCode;
const constants = reload('./../kotoba/constants.js');

module.exports = {
  commandAliases: ['k!help', 'k!h'],
  cooldown: 2,
  action(bot, msg, suffix) {
    if (suffix === 'gt') {
      let message = '```glsl\n';
      message += '# k!gt\n\n';
      message += 'The k!gt command can be used to translate between many languages. The syntax is k!gt-[from language code]/[to language code]. For example, k!gt-de/ru to translate from German to Russian.\n\n';
      message += 'Supported languages:\n';
      let keys = Object.keys(prettyLanguageForLanguageCode);
      for (let i = 0; i < keys.length; ++i) {
        message += prettyLanguageForLanguageCode[keys[i]] + ' (' + keys[i] + ')';
        if (i < keys.length - 1) {
          message += ', ';
        }
      }
      message += '```';
      bot.createMessage(msg.channel.id, message);
    } else if (suffix === 'more') {
      let content = {};
      content.embed = {};
      content.embed.color = constants.EMBED_NEUTRAL_COLOR;
      content.embed.title = 'Advanced Help';
      content.embed.fields = [
        {name: 'Dictionary', value: 'You can search for dictionary entries in many different languages.\nI support English (en), German (de), Japanese (ja), French (fr), Spanish (es), Russian (ru), Mandarin Chinese (zh), Italian (it), Arabic (ar), and Polish (pl).\nTo search for Italian definitions of a Russian word for example, say \'k!ru-it [word]\''},
        {name: 'Translation', value: 'You can translate to and from many different languages with my k!gt command. For more information and a list of supported languages, say \'k!help gt\''},
        {name: 'Quiz settings', value: 'You can configure the score limit and the delay between questions. Say \'k!quiz [deck] [score limit] [delay in seconds]\'. For example: \'k!quiz n5 25 0\''},
        {name: 'Server admin commands', value: '(You must have a role named \'Kotoba\' in order to run these commands)\n\nUse \']allowcommand k!quiz #channelname-1 #channelname-2 #channelname-x\' to specify which channels the quiz feature is allowed to be used in.\n\nUse \']unrestrictcommand k!quiz\' to allow the quiz command to be used in any channel.\n\nUse \']bancommand k!quiz\' to ban the quiz command in all channels.\n\n(Most of my other commands can also be restricted like this)'}
      ];
      bot.createMessage(msg.channel.id, content);
    } else {
      let message = `\`\`\`glsl
// Here are my commands!
k!j [word] (short: !j)
\t# Search Jisho for an English or Japanese word. For example: k!j 家族
k!quiz [deck] (short: k!q)
\t# Start a quiz with the specified deck. k!quizdecks lists available decks. \'k!quiz stop\' stops the quiz.
k!kanji [kanji] (short: k!k)
\t# Search for information about a Kanji. For example: k!kanji 雨
k!strokeorder [kanji] (short: k!so)
\t# Search for details about a Kanji\'s strokes. For example: k!strokeorder 雨
k!gt [text]
\t# Use google translate to translate text. For example: k!gt 日本
k!jukebox
\t# I will choose a song for you (probably Touhou or Vocaloid)
k!examples [word] (short: k!ex)
\t# Search Jisho for examples of a word.
k!invite
\t# Get a link to invite me to your server :)
k!help more
\t# Show advanced help
k!about
\t# See some meta information about me.
\`\`\``;
      bot.createMessage(msg.channel.id, message);
    }
  },
};
