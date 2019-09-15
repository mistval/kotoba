

const shiritoriForeverHelper = require('./../discord/shiritori_forever_helper');

module.exports = {
  name: 'Shiritori Forever Answer',
  logLevel: 'debug',
  action: (bot, msg, monochrome) => shiritoriForeverHelper.tryHandleMessage(monochrome, msg),
};
