const logger = require('./logger.js');
const assert = require('assert');

/**
* An error containing a message that should be sent to the channel the command was invoked in.
* That message gets sent instead of the generic error message (assuming commands and message processors
* and such are returning their promises).
*/
class PublicError extends Error {
  /**
  * @param {String} publicMessage - The message to send to the channel.
  * @param {String} logDescription - Brief description of the error (for logging).
  * @param {Error} [internalError] - The original error that was thrown (if one exists and you want its stack trace logged)
  */
  constructor(publicMessage, logDescription, internalErr) {
    assert(publicMessage || logDescription || internalErr, 'PublicError must be constructed with at least one argument');
    super(publicMessage, internalErr && internalErr.fileName, internalErr && internalErr.lineNumber);
    this.publicMessage = publicMessage;
    this.internalErr = internalErr;
    this.logDescription = logDescription;
  }
}

module.exports = PublicError;
