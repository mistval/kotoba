
const reload = require('require-reload')(require);

const textRenderer = reload('./../kotoba/render_text.js');
const { PublicError } = reload('monochrome-bot');

module.exports = {
  commandAliases: ['k!furigana', 'k!furi', 'k!f'],
  cooldown: 5,
  uniqueId: 'furigana5345',
  shortDescription: 'Render furigana for Japanese text.',
  usageExample: 'k!furigana 吾輩は猫である',
  action: async function action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage('Say \'k!furigana [Japanese text]\' to render Japanese text with furigana!', true, 'No suffix');
    }

    if (suffix.length > 200) {
      throw PublicError.createWithCustomPublicMessage('Two hundred characters or fewer please :)', true, 'Too long');
    }

    const buffer = await textRenderer.renderJapaneseWithFurigana(suffix);
    return msg.channel.createMessage('', { name: 'furigana.png', file: buffer }, msg);
  },
};
