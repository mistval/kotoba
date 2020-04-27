const { render } = require('./../common/render_text.js');
const fontHelper = require('./../common/font_helper.js');
const { throwPublicErrorInfo } = require('./../common/util/errors.js');
const constants = require('./../common/constants.js');

const longDescription = `Use this command to test font settings by drawing some text. You can specify the font, text color, background color, and size using command arguments. The arguments are:

\`font=X\` where X is the number of the font you want to use (see below)
\`color=rgb(R,G,B)\` where R, G, and B are the red, green, and blue components, each a number between 0-255, to use for the **text** color. (rgba works too, along with hsl, hsla, HTML color names, and HTML hex colors)
\`bgcolor=rgb(R,G,B)\` where R, G, and B are the red, green, and blue components, each a number between 0-255, to use for the **background** color. (rgba works too, along with hsl, hsla, HTML color names, and HTML hex colors)
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

    const argumentParseResult = fontHelper.parseFontArgs(suffix);
    if (argumentParseResult.errorDescriptionShort) {
      return throwPublicErrorInfo('Draw', argumentParseResult.errorDescriptionLong, argumentParseResult.errorDescriptionShort);
    }

    const fontFamily = argumentParseResult.fontFamily || settings.quiz_font;
    const color = argumentParseResult.color || settings.quiz_font_color;
    const bgColor = argumentParseResult.bgColor || settings.quiz_background_color;
    const size = argumentParseResult.size || settings.quiz_font_size;
    const text = argumentParseResult.remainingString || '日本語';

    if (text.length > 10) {
      return throwPublicErrorInfo('Draw', 'Please give me no more than 10 characters to draw.', 'Input too long');
    }

    const renderResult = await render(text, color, bgColor, size, fontFamily, false);
    const fontCharWarning = fontHelper.fontSupportsString(fontFamily, text)
      ? ''
      : '**WARNING: The selected font doesn\'t support some characters in your input.**';

    return msg.channel.createMessage(
      {
        embed: {
          title: 'Draw',
          description: `Font: **${fontFamily}**\nText color: **${color}**\nBackground color: **${bgColor}**\nFont size: **${size}**\n${fontCharWarning}`,
          image: { url: 'attachment://upload.png' },
          color: constants.EMBED_NEUTRAL_COLOR,
        },
      },
      { file: renderResult, name: 'upload.png' },
    );
  },
};
