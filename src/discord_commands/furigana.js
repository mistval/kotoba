const reload = require('require-reload')(require);

const textRenderer = reload('./../kotoba/render_text.js');
const { throwPublicErrorInfo } = reload('./../kotoba/util/errors.js');
const { PublicError } = reload('monochrome-bot');

module.exports = {
  commandAliases: ['k!furigana', 'k!furi', 'k!f'],
  cooldown: 5,
  uniqueId: 'furigana5345',
  shortDescription: 'Render furigana for Japanese text.',
  usageExample: 'k!furigana 吾輩は猫である',
  action: async function action(erisBot, monochrome, msg, suffix) {
    if (!suffix) {
      return throwPublicErrorInfo('Furigana', 'Say **k!furigana [Japanese text]** to render Japanese text with furigana. For example: **k!f 家を出てすぐの所**', 'No suffix');
    }

    if (suffix.length > 200) {
      throw PublicError.createWithCustomPublicMessage('Two hundred characters or fewer please :)', true, 'Too long');
    }

    const buffer = await textRenderer.renderJapaneseWithFurigana(suffix);
    return msg.channel.createMessage('', { name: 'furigana.png', file: buffer }, msg);
  },
};
