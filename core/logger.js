'use strict'
const reload = require('require-reload')(require);
const fs = require('fs');

const LOGGER_TITLE = 'LOGGER';

let implementation;

/**
* Logs text to both the console and to log files. Singleton.
* @property {boolean} closed - True if close() has been called and the logger is closed. No further methods should be called on the logger if this is true.
*/
class Logger {
  /**
  * @param {String} [logDirectoryPath=undefined] - The directory to save logs to. If undefined or empty, logs will not be logged to disk.
  * @param {Boolean} [useANSIColorsInLogFiles=false] - Whether ANSI color codes should be printed to the log file or not. If you're going to cat the files in a console, you probably want this to be true. If you're going to open them in notepad, false.
  */
  initialize(logDirectoryPath, useANSIColorsInLogFiles) {
    this.reload();
    if (this.logToFile_) {
      implementation.logFailure(this, LOGGER_TITLE, 'Logger already initialized. Someone is trying to initialize it again', new Error('Logger error'));
      return;
    }

    try {
      fs.mkdirSync(logDirectoryPath);
    } catch (err) { }

    this.closed_ = false;
    this.logToFile_ = !!logDirectoryPath;
    this.useANSIColorsInLogFiles_ = !!useANSIColorsInLogFiles;
    if (this.logToFile_) {
      let logFilePath = logDirectoryPath + '/log_' + new Date().toISOString() + '.log';
      this.fileStream_ = fs.createWriteStream(logFilePath);
      this.fileStream_.on('error', (err) => {
        this.logToFile_ = false;
        implementation.logFailure(this, LOGGER_TITLE, 'Error logging to file. Disabling logging to file.', err);
      });
    }
  }

  /**
  * Reload the class' main implementation. Since this class is a singleton and holds a file handle that we don't want to close, we do not reload this class itself.
  */
  reload() {
    implementation = reload('./implementations/logger_implementation.js');
  }

  /**
  * Log when the bot reacts to a message.
  * @param {String} title - The title of the log message.
  * @param {Eris.Message} msg - The message that was reacted to.
  * @param {String} inputReactorTitle - If this was in response to a message processor, then the name of that message processor. If no title, pass in an empty string.
  * @param {Boolean} succeeded - Whether the log message should appear as a successful event (green), or unsuccessful one (red).
  * @param {String} [failureMessage] - If the reaction failed, a brief description of why.
  */
  logInputReaction(title, msg, inputReactorTitle, succeeded, failureMessage) {
    implementation.logInputReaction(this, title, msg, inputReactorTitle, succeeded, failureMessage);
  }

  /**
  * Log a message with a success color (green).
  * @param {String} title - The title of the message, which will be displayed in green.
  * @param {(String|LogMessageBuilder)} message - The message to log.
  */
  logSuccess(title, message) {
    implementation.logSuccess(this, title, message);
  }

  /**
  * Log a message with a failure color (red).
  * @param {String} title - The title of the message, which will be displayed in red.
  * @param {(String|LogMessageBuilder)} message - The message to log.
  * @param {Error} [err] - The error object, if there was one.
  */
  logFailure(title, message, err) {
    implementation.logFailure(this, title, message, err);
  }

  /**
  * Closes and finalizes the logger.
  * @returns {Promise} A promise that is fulfilled when the logger is successfully closed.
  */
  close() {
    return implementation.close(this);
  }
}

module.exports = new Logger();
