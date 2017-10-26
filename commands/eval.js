'use strict'
/**
* Send a message as the bot. }eval [javascript code]
*/
module.exports = {
  commandAliases: ['}eval'],
  botAdminOnly: true,
  action(bot, msg, suffix) {
    if (!suffix) {
      return msg.channel.createMessage('Say \'}eval [javascript code]\' to evaluate code.');
    }
    let result = eval(suffix);
    let text = JSON.stringify(result);
    return msg.channel.createMessage('```js\n' + text + '\n```');
  },
};
