'use strict'
const reload = require('require-reload')(require);
const textRenderer = reload('./../kotoba/render_text.js');

/**
* Delete a message (if the bot has moderator powers it can delete the messages of others. If not it can only delete its own messages).
* Syntax: }delete [channel_id] [message_id]
*/
module.exports = {
  commandAliases: ['k!furigana', 'k!furi', 'k!f'],
  cooldown: 5,
  uniqueId: 'furigana5345',
  shortDescription: 'Render furigana for Japanese text.',
  usageExample: 'k!furigana 吾輩は猫である',
  action(bot, msg, suffix) {
    if (!suffix) {
      msg.channel.createMessage('Say \'k!furigana [Japanese text]\' to render Japanese text with furigana!');
      return;
    }
    if (suffix.length > 200) {
      msg.channel.createMessage('Two hundred characters or fewer please :)');
      return 'Too many characters';
    }
    return textRenderer.renderJapaneseWithFurigana(suffix).then(buffer => {
      msg.channel.createMessage('', {name: 'furigana.png', file: buffer});
    });
  },
};
