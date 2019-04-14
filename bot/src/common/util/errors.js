const reload = require('require-reload')(require);

const { PublicError } = require('monochrome-bot');

const constants = reload('./../constants.js');

function throwPublicError(sourceCommandName, publicMessage, logMessage, embedColor, err) {
  const errorContent = {
    embed: {
      title: sourceCommandName,
      description: publicMessage,
      color: embedColor,
    },
  };

  throw PublicError.createWithCustomPublicMessage(errorContent, false, logMessage, err);
}

function throwPublicErrorInfo(sourceCommandName, publicMessage, logMessage) {
  return throwPublicError(
    sourceCommandName,
    publicMessage,
    logMessage,
    constants.EMBED_NEUTRAL_COLOR,
  );
}

function throwPublicErrorFatal(sourceCommandName, publicMessage, logMessage, err) {
  return throwPublicError(
    sourceCommandName,
    publicMessage,
    logMessage,
    constants.EMBED_WRONG_COLOR,
    err,
  );
}

module.exports = {
  throwPublicErrorInfo,
  throwPublicErrorFatal,
};
