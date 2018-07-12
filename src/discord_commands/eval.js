const reload = require('require-reload')(require);

const { PublicError } = reload('monochrome-bot');

/**
* Evaluate arbitrary javascript code and return the result. Syntax: }eval [javascript code]
*/
module.exports = {
  commandAliases: ['eval'],
  botAdminOnly: true,
  shortDescription: 'Evaluate arbitrary javascript code (use wisely).',
  usageExample: '}eval 4+5',
  hidden: true,
  uniqueId: 'eval',
  action(bot, msg, suffix) {
    if (!suffix) {
      throw PublicError.createWithCustomPublicMessage('Say \'}eval [javascript code]\' to evaluate code.', false, 'No suffix');
    }

    // Ya, I know it's dangerous, that's why it's admin only.
    // eslint-disable-next-line no-eval
    const result = eval(suffix);

    const text = JSON.stringify(result, null, 2);
    return msg.channel.createMessage(`\`\`\`js\n${text}\n\`\`\``, null, msg);
  },
};
