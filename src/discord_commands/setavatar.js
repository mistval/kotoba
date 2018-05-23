const reload = require('require-reload')(require);
const request = require('request-promise').defaults({ encoding: null });

const { PublicError } = reload('monochrome-bot');

/**
* Sets the bot avatar.
* Syntax: }setavatar [http url]
*/
module.exports = {
  commandAliases: ['}setavatar'],
  botAdminOnly: true,
  shortDescription: 'Change my avatar.',
  usageExample: '}setavatar http://url.com/image.png',
  hidden: true,
  action: async function action(erisBot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage('Say \'}setavatar [http url]\' to set my avatar.', false, 'invalid syntax');
    }

    try {
      const response = await request({
        uri: suffix,
        json: false,
        resolveWithFullResponse: true,
      });

      const dataUri = `data:image/${response.headers['content-type']};base64,${Buffer.from(response.body).toString('base64')}`;
      await erisBot.editSelf({ avatar: dataUri });
      return await msg.channel.createMessage('Avatar updated!');
    } catch (err) {
      throw PublicError.createWithCustomPublicMessage('Error updating avatar, check the logs for error info.', false, '', err);
    }
  },
};
