const reload = require('require-reload')(require);

const shiritoriForeverHelper = reload('./../discord/shiritori_forever_helper');

module.exports = {
  name: 'Shiritori Forever Answer',
  action: (bot, msg, monochrome) => shiritoriForeverHelper.tryHandleMessage(monochrome, msg),
};
