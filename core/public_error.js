const logger = require('./logger.js');

/**
* An error containing a message that should be sent to the channel the command was invoked in.
* That message gets sent instead of the generic error message.
*/
class PublicError extends Error {
  /**
  * @param {String} source - A title for the source of the error.
  * @param {String} publicMessage - The message to send to the channel.
  * @param {Error} [internalError] - The original error that was thrown (if one exists)
  */
  constructor(source, publicMessage, internalError) {
    super(publicMessage, internalError.fileName, internalError.lineNumber);
    this.publicMessage = publicMessage;
    logger.logFailure(source.toUpperCase(), 'Public error created. Public message: ' + publicMessage, internalError);
  }
}

module.exports = PublicError;
