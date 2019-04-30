

const shiritoriForeverHelper = require('./../discord/shiritori_forever_helper');

module.exports = {
  name: 'Shiritori Forever Answer',
  action: (bot, msg, monochrome) => shiritoriForeverHelper.tryHandleMessage(monochrome, msg),
};
