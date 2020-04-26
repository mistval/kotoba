const { render } = require('./../common/render_text.js');
const fontHelper = require('./../common/font_helper.js');
const { throwPublicErrorInfo } = require('./../common/util/errors.js');
const colorValidator = require('validate-color');
const constants = require('./../common/constants.js');

const longDescription = `Test font settings by drawing some text. You can specify the font, text color, and background color using command arguments. The arguments are:

\`font=X\` where X is the number of the font you want to use (see below)
\`color=rgb(R,G,B)\` where R, G, and B are the red, green, and blue components, each a number between 0-255, to use for the **text** color. (\`rgba\` can also be used)
\`bgcolor=rgb(R,G,B)\` where R, G, and B are the red, green, and blue components, each a number between 0-255, to use for the **background** color. (\`rgba\` can also be used)
\`size=X\` where X is the size in pixels (20-200)

For example:
\`<prefix>draw 日本語 font=5 color=rgb(100,150,200) bgcolor=rgb(210,220,230) size=80\`

When you find settings you like, you can use <prefix>settings to set them permanently, or use the same arguments in a quiz start command (for example \`<prefix>quiz n1 font=8\`)

Available fonts:

${
  fontHelper.installedFonts
    .filter(f => !f.hidden)
    .map((f, i) => `${i + 1}. ${f.fontFamily}`)
    .join('\n')
  }
`;

function validateColor(color) {
  return colorValidator.validateHTMLColor(color)
    || colorValidator.validateHTMLColorHex(color)
    || colorValidator.validateHTMLColorName(color);
}

module.exports = {
  commandAliases: ['draw'],
  uniqueId: 'draw',
  cooldown: 1.5,
  shortDescription: 'Test font settings by drawing some text.',
  longDescription,
  requiredSettings: [
    'quiz_font_color',
    'quiz_background_color',
    'quiz_font_size',
    'quiz_font',
  ],
  async action(bot, msg, suffix, monochrome, settings) {
    if (!suffix) {
      const help = longDescription.replace(/<prefix>/g, msg.prefix);
      return throwPublicErrorInfo('Draw', help, 'No arguments');
    }

    let specifiedFontArgument = false;
    let font = settings.quiz_font;
    let color = settings.quiz_font_color;
    let bgColor = settings.quiz_background_color;
    let size = settings.quiz_font_size;

    const text = suffix
      .replace(/,\s+/g, ',').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
      .replace(/font\s*=\s*([0-9]*)+/i, (m, g1) => {
      specifiedFontArgument = true;
      font = g1.replace(/\s/, '').toLowerCase();
      return '';
    }).replace(/color\s*=\s*(\S*)/i, (m, g1) => {
      color = g1.replace(/\s/, '').toLowerCase();
      return '';
    }).replace(/bgcolor\s*=\s*(\S*)/i, (m, g1) => {
      bgColor = g1.replace(/\s/, '').toLowerCase();
      return '';
    }).replace(/size\s*=\s*([0-9]*)+/i, (m, g1) => {
      size = g1.replace(/\s/, '').toLowerCase();
      return '';
    }).trim() || '日本語';

    if (specifiedFontArgument) {
      const fontInt = parseInt(font);
      const { fontFamily } = (fontHelper.installedFonts[fontInt - 1] || {});

      if (!fontFamily) {
        return throwPublicErrorInfo('Draw', `Please provide a number between 1 and ${fontHelper.installedFonts.length} as your font= setting.`, 'Invalid font');
      }

      font = fontFamily;
    }

    const sizeInt = parseInt(size);

    if (text.length > 10) {
      return throwPublicErrorInfo('Draw', `Please give me no more than 10 characters to draw.`, 'Input too long');
    }
    if (!validateColor(color)) {
      return throwPublicErrorInfo('Draw', `Please provide a valid HTML color as your color= setting.`, 'Invalid color');
    }
    if (!validateColor(bgColor)) {
      return throwPublicErrorInfo('Draw', `Please enter a valid HTML color as your bgcolor= setting.`, 'Invalid bgcolor');
    }
    if (sizeInt < 20 || sizeInt > 200) {
      return throwPublicErrorInfo('Draw', `Please enter a number between 20 and 200 as your size= setting.`, 'Invalid size');
    }

    const renderResult = await render(text, color, bgColor, sizeInt, font);

    return msg.channel.createMessage(
      {
        embed: {
          title: 'Draw',
          description: `__Drawn with__\nFont: **${font}**\nText color: **${color}**\nBackground color: **${bgColor}**\nFont size: **${sizeInt}**`,
          image: { url: 'attachment://upload.png' },
          color: constants.EMBED_NEUTRAL_COLOR,
        },
      },
      { file: renderResult, name: 'upload.png' },
    );
  },
};
