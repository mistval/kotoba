'use strict'
const reload = require('require-reload')(require);
const FileSystemUtils = reload('./util/file_system_utils.js');
const MessageProcessor = reload('./message_processor.js');
const PublicError = reload('./../core/public_error.js');

function handleError(msg, err, logger) {
  const loggerTitle = 'MESSAGE';
  let errDescription = err.logDescription || 'Exception or promise rejection';
  let internalErr = err instanceof PublicError ? err.internalErr : err;
  logger.logInputReaction(loggerTitle, msg, '', false, errDescription);
  if (internalErr) {
    logger.logFailure(loggerTitle, 'A message processor threw an exception or returned a promise that rejected for message: \'' + msg.content + '\'', internalErr);
  }
}

/**
* Loads and executes commands in response to user input.
*/
class MessageProcessorManager {
  /**
  * @param {String} directory - The directory to load message processors from
  * @param {Logger} logger - The logger to log to
  */
  constructor(directory, logger) {
    this.directory_ = directory;
    this.logger_ = logger;
    this.processors_ = [];
  }

  /**
  * Loads message processors. Can be called to reload message processors that have been edited.
  */
  load() {
    const loggerTitle = 'MESSAGE MANAGER';
    this.processors_ = [];
    return FileSystemUtils.getFilesInDirectory(this.directory_).then((processorFiles) => {
      for (let processorFile of processorFiles) {
        try {
          let processorInformation = reload(processorFile);
          let processor = new MessageProcessor(processorInformation);
          this.processors_.push(processor);
        } catch (err) {
          this.logger_.logFailure(loggerTitle, 'Failed to load message processor from file: ' + processorFile, err);
        }
      }
      this.processors_.push(new MessageProcessor(reload('./message_processors/user_and_channel_hook.js')));
    }).catch(err => {
      this.logger_.logFailure(loggerTitle, 'Error loading message processors.', err);
    });
  }

  /**
  * Receives and considers agreeing to process user input.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {Eris.Message} msg - The msg to process.
  * @param {Config} config - The monochrome configuration.
  * @returns {Boolean} True if a message processor accepted responsibility to handle the message and did so, false otherwise.
  */
  processInput(bot, msg) {
    const loggerTitle = 'MESSAGE';
    for (let processor of this.processors_) {
      try {
        let result = processor.handle(bot, msg);
        if (result && result.then) {
          result.then(innerResult => {
            if (typeof innerResult === typeof '') {
              this.logger_.logInputReaction(loggerTitle, msg, processor.name, false, innerResult);
            } else {
              this.logger_.logInputReaction(loggerTitle, msg, processor.name, true);
            }
          }).catch(err => handleError(msg, err, this.logger_));
          return true;
        } else if (typeof result === typeof '') {
          this.logger_.logInputReaction(loggerTitle, msg, processor.name, false, result);
          return true;
        } else if (result === true) {
          this.logger_.logInputReaction(loggerTitle, msg, processor.name, true);
          return true;
        } else if (result !== false) {
          this.logger_.logFailure(loggerTitle, 'Message processor \'' + processor.name +
            '\' returned an invalid value. It should return true if it will handle the message, false if it will not. A string return value will be treated as true and logged as an error. A promise will be treated as true and resolved.');
        }
      } catch (err) {
        handleError(msg, err, this.logger_);
      };
    }

    return false;
  }
}

module.exports = MessageProcessorManager;
