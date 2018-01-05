'use strict'
const reload = require('require-reload')(require);
const PublicError = reload('monochrome-bot').PublicError;

/**
* Evaluate arbitrary javascript code and return the result. Syntax: }eval [javascript code]
*/
module.exports = {
  commandAliases: ['}eval'],
  botAdminOnly: true,
  shortDescription: 'Evaluate arbitrary javascript code (use wisely).',
  usageExample: '}eval 4+5',
  action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage('Say \'}eval [javascript code]\' to evaluate code.', false, 'No suffix');
    }
    let result = eval(suffix);
    let text = JSON.stringify(result, null, 2);
    return msg.channel.createMessage('```js\n' + text + '\n```');
  },
};
