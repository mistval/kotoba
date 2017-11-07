'use strict'
/**
* Demonstrates how to require a setting from the database.
* The setting is defined in ./../server_settings.json.
* Syntax: }broadcast [channel_id] [announcement]
*/
module.exports = {
  commandAliases: ['bot!countdown'],
  botAdminOnly: false,
  uniqueId: 'countdown29490',
  requiredSettings: ['fun/countdown_start'],
  shortDescription: 'Start a countdown.',
  hidden: false,
  action(bot, msg, suffix, settings) {
    let countdownStart = settings['fun/countdown_start'];
    for (let i = countdownStart; i >= 0; --i) {
      setTimeout(() => {
        msg.channel.createMessage(i.toString());
      }, (countdownStart - i) * 2000);
    }
  },
};
