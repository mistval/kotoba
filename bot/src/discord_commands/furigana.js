const axios = require('axios').create({ timeout: 10000 });
const qs = require('qs');
const { throwPublicErrorFatal, throwPublicErrorInfo } = require('./../common/util/errors.js');
const { Permissions } = require('monochrome-bot');

const WORKER_HOST = process.env.WORKER_HOST || 'localhost';

module.exports = {
  commandAliases: ['furigana', 'furi', 'f'],
  cooldown: 5,
  uniqueId: 'furigana5345',
  shortDescription: 'Render furigana for Japanese text.',
  usageExample: '<prefix>furigana 吾輩は猫である',
  requiredBotPermissions: [Permissions.attachFiles, Permissions.sendMessages],
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

    if (suffix.length > 500) {
      return throwPublicErrorInfo('Furigana', 'Five hundred characters or fewer please :)', 'Too long');
    }

    const args = qs.stringify({
      text: suffix,
      size: settings.furigana_main_font_size,
      color: settings.furigana_font_color,
      background_color: settings.furigana_background_color,
      font_alias: settings.furigana_font,
    });

    let pngData;
    try {
      const axiosResponse = await axios({
        url: `http://${WORKER_HOST}/furigana/rendered?${args}`,
        responseType: 'arraybuffer',
      });

      pngData = axiosResponse.data;
    } catch (err) {
      return throwPublicErrorFatal(
        'Furigana',
        'Sorry, there was a problem communicating with the furigana service, please try again later.',
        'Furigana worker error',
        err,
      );
    }

    return msg.channel.createMessage('', { name: 'furigana.png', file: pngData }, msg);
  },
};
