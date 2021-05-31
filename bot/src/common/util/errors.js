

const { FulfillmentError } = require('monochrome-bot');

const constants = require('./../constants.js');

function throwPublicError(sourceCommandName, publicMessage, logDescription, embedColor, err) {
  const errorContent = {
    embed: {
      title: sourceCommandName,
      description: publicMessage,
      color: embedColor,
    },
  };

  throw new FulfillmentError({
    publicMessage: errorContent,
    logDescription,
    error: err,
  });
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
