const { FulfillmentError } = require('monochrome-bot');
const { botAdminIds } = require('../../../config/config.js').bot;

/**
* Evaluate arbitrary javascript code and return the result. Syntax: }eval [javascript code]
*/
module.exports = {
  commandAliases: ['eval'],
  botAdminOnly: true,
  shortDescription: 'Evaluate arbitrary javascript code (use wisely).',
  usageExample: '<prefix>eval 4+5',
  uniqueId: 'eval',
  hidden: true,
  async action(bot, msg, suffix) {
    if (!suffix) {
      throw new FulfillmentError({
        publicMessage: `Say **${msg.prefix}eval javascript_code_here** to evaluate code.`,
        logDescription: 'No argument',
      });
    }

    if (botAdminIds.indexOf(msg.author.id) === -1) {
      throw new FulfillmentError({
        logDescription: 'Eval command is executing for non-Admin',
        logLevel: 'fatal',
      });
    }

    try {
      // eslint-disable-next-line no-eval
      const result = await eval(suffix);
      const text = JSON.stringify(result, null, 2);

      return msg.channel.createMessage(`\`\`\`js\n${text}\n\`\`\``);
    } catch (err) {
      return msg.channel.createMessage(`\`\`\`${err.stack}\`\`\``);
    }
  },
};
