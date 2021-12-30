const ProxyAgent = require('https-proxy-agent');

module.exports = {
  commandAliases: ['setproxy'],
  botAdminOnly: true,
  uniqueId: 'setproxy',
  hidden: true,
  async action(bot, msg, suffix) {
    const proxyHost = suffix.trim();

    const proxyAgent = suffix === 'none'
      ? null
      : new ProxyAgent({
        host: proxyHost,
        port: 3128,
      });

    // Epic hack: reaching into internals
    // eslint-disable-next-line no-param-reassign
    bot.requestHandler.options.agent = proxyAgent;

    return msg.channel.createMessage('Proxy updated.');
  },
};
