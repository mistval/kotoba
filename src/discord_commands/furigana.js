const reload = require('require-reload')(require);

const textRenderer = reload('./../common/render_text.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');
const { PublicError } = require('monochrome-bot');

module.exports = {
  commandAliases: ['furigana', 'furi', 'f'],
  cooldown: 5,
  uniqueId: 'furigana5345',
  shortDescription: 'Render furigana for Japanese text.',
  usageExample: '**<prefix>furigana 吾輩は猫である**',
  requiredSettings: [
    'furigana_main_font_size',
    'furigana_font_color',
    'furigana_background_color',
    'furigana_font',
  ],
  action: async function action(erisBot, msg, suffix, monochrome, settings) {
    if (!suffix) {
      const { prefix } = msg;
      return throwPublicErrorInfo('Furigana', `Say **${prefix}furigana [Japanese text]** to render Japanese text with furigana. For example: **${prefix}furigana 家を出てすぐの所**`, 'No suffix');
    }

    if (suffix.length > 200) {
      throw PublicError.createWithCustomPublicMessage('Two hundred characters or fewer please :)', true, 'Too long');
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
