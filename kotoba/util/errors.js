const reload = require('require-reload')(require);
const { PublicError } = reload('monochrome-bot');
const constants = reload('./../constants.js');

function throwPublicErrorInfo(sourceCommandName, publicMessage, logMessage) {
  const errorContent = {
    embed: {
      title: sourceCommandName,
      description: publicMessage,
      color: constants.EMBED_NEUTRAL_COLOR,
    },
  };

  throw PublicError.createWithCustomPublicMessage(errorContent, false, logMessage);
}

module.exports = {
  throwPublicErrorInfo,
};
