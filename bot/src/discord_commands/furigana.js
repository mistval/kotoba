

const textRenderer = require('./../common/render_text.js');
const { throwPublicErrorInfo } = require('./../common/util/errors.js');
const { FulfillmentError } = require('monochrome-bot');

module.exports = {
  commandAliases: ['furigana', 'furi', 'f'],
  cooldown: 5,
  uniqueId: 'furigana5345',
  shortDescription: 'Render furigana for Japanese text.',
  usageExample: '<prefix>furigana 吾輩は猫である',
  requiredSettings: [
    'furigana_main_font_size',
    'furigana_font_color',
    'furigana_background_color',
    'furigana_font',
  ],
  async action(bot, msg, suffix, monochrome, settings) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Furigana', `Say **${prefix}furigana [Japanese text]** to render Japanese text with furigana. For example: **${prefix}furigana 家を出てすぐの所**`, 'No suffix');
    }

    if (suffix.length > 200) {
      throw new FulfillmentError({
        publicMessage: 'Two hundred characters or fewer please :)',
        autoDeletePublicMessage: true,
        logDescription: 'Too long',
      });
    }

    const buffer = await textRenderer.renderJapaneseWithFurigana(
      suffix,
      settings.furigana_main_font_size,
      settings.furigana_font_color,
      settings.furigana_background_color,
      settings.furigana_font,
    );

    return msg.channel.createMessage('', { name: 'furigana.png', file: buffer }, msg);
  },
};
