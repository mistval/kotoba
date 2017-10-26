'use strict'
const reload = require('require-reload')(require);
const FileSystemUtils = reload('./util/file_system_utils.js');
const MessageProcessor = reload('./message_processor.js');

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
  processInput(bot, msg, config) {
    const loggerTitle = 'MESSAGE';
    for (let processor of this.processors_) {
      try {
        let result = processor.handle(bot, msg, config);
        if (result === true) {
          this.logger_.logInputReaction(loggerTitle, msg, processor.name, result);
          return true;
        } else if (typeof result === typeof '') {
          this.logger_.logInputReaction(loggerTitle, msg, processor.name, false, result);
          return true;
        } else if (result && typeof result.then === 'function') {
          result.then(innerResult => {
            if (typeof innerResult === typeof true) {
              this.logger_.logInputReaction(loggerTitle, msg, processor.name, innerResult);
            } else if (typeof innerResult === typeof '') {
              this.logger_.logInputReaction(loggerTitle, msg, processor.name, false, innerResult);
            } else {
              this.logger_.logInputReaction(loggerTitle, msg, processor.name, true);
            }
          }).catch(err => {
            // Do not send an error message to the Discord channel here, because there's a possibility the message processor is throwing on every message sent.
            this.logger_.logInputReaction(loggerTitle, msg, processor.name, false, 'Promise reject');
            this.logger_.logFailure(loggerTitle, 'MessageProcessor \'' + processor.name + '\' returned a promise that rejected.', err);
          });
          return true;
        } else if (result !== false) {
          this.logger_.logInputReaction(loggerTitle, msg, processor.name, false, 'Message processor invalid return value');
          this.logger_.logFailure(loggerTitle, 'Message processor \'' + processor.name +
            '\' returned an invalid value. It should return true if it will handle the message, false if it will not. A string return value will be treated as true and logged as an error. A promise will be treated as true and resolved.');
        }
      } catch (err) {
        // Do not send an error message to the Discord channel here, because there's a possibility the message processor is throwing on every message sent.
        this.logger_.logInputReaction(loggerTitle, msg, processor.name, false, 'Exception');
        this.logger_.logFailure(loggerTitle, 'MessageProcessor \'' + processor.name + '\' threw an exception.', err);
      };
    }

    return false;
  }
}

module.exports = MessageProcessorManager;
