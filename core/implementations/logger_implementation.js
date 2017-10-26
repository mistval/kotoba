'use strict'
const reload = require('require-reload')(require);
const fs = require('fs');
const ansiColors = reload('./../util/ansi_color_codes.js');
const LogMessageBuilder = reload('./../log_message_builder');

class LoggerImplementation {
  static logInputReaction(loggerState, title, msg, inputReactorTitle, succeeded, failureMessage) {
    try {
      let logMessageBuilder = new LogMessageBuilder();
      logMessageBuilder.setColor(ansiColors.YELLOW);
      if (msg.channel.guild) {
        logMessageBuilder.append(msg.channel.guild.name);
        logMessageBuilder.setColor(ansiColors.RESET);
        logMessageBuilder.append(' >> ');
        logMessageBuilder.setColor(ansiColors.YELLOW);
        logMessageBuilder.append(msg.channel.name);
        logMessageBuilder.setColor(ansiColors.RESET);
        logMessageBuilder.append(' >> ');
      }
      logMessageBuilder.setColor(ansiColors.BLUE);
      logMessageBuilder.append(msg.author.username + '#' + msg.author.discriminator);
      logMessageBuilder.setColor(ansiColors.RESET);
      logMessageBuilder.append(' >> ');
      if (inputReactorTitle) {
        logMessageBuilder.append('[' + inputReactorTitle + '] ');
      }
      logMessageBuilder.setColor(ansiColors.MAGENTA);
      logMessageBuilder.append(msg.content);

      if (succeeded) {
        LoggerImplementation.logSuccess(loggerState, title, logMessageBuilder);
      } else {
        if (failureMessage) {
          logMessageBuilder.setColor(ansiColors.RED);
          logMessageBuilder.append(' FAILED (' + failureMessage + ')');
        }
        LoggerImplementation.logFailure(loggerState, title, logMessageBuilder);
      }
    } catch (err) {
      console.warn('Failed to log input reaction. Error: ' + err);
    }
  }

  static logSuccess(loggerState, title, message) {
    if (LoggerImplementation.checkState_(loggerState)) {
      LoggerImplementation.logMessage(loggerState, title, '\u001b[32m', message);
    }
  }

  static logFailure(loggerState, title, message, err) {
    if (LoggerImplementation.checkState_(loggerState)) {
      LoggerImplementation.logMessage(loggerState, title, '\u001b[31m', message, err);
    }
  }

  static logMessage(loggerState, title, titleColor, message, err) {
    try {
      if (LoggerImplementation.checkState_(loggerState)) {
        let errString = '';
        let messageWithFormatting = message;
        let messageWithoutFormatting = message;
        if (typeof message !== typeof '') {
          messageWithFormatting = message.messageWithFormatting;
          messageWithoutFormatting = message.messageWithoutFormatting;
        }

        if (err) {
          errString += '  Error: ' + err + '\n';
          errString += '  Stack: ' + err.stack + '\n';
        }

        let timeStamp = LoggerImplementation.createTimestamp_();
        let consoleString = timeStamp + ' ';
        consoleString += titleColor;
        consoleString += title;
        consoleString += '\u001b[0m ';
        consoleString += messageWithFormatting;
        consoleString += ' \u001b[0m';
        consoleString += errString;

        console.log(consoleString);
        if (loggerState.logToFile_) {
          let fileString = consoleString;
          if (!loggerState.useANSIColorsInLogFiles_) {
            fileString = timeStamp + ' ' + title + ': ' + messageWithoutFormatting + ' ' + errString;
          }
          loggerState.fileStream_.write(fileString + '\n');
        }
      }
    } catch (err) {
      console.warn('Failed to log message. Error: ' + err);
    }
  }

  static close(loggerState) {
    return new Promise((fulfill, reject) => {
      if (LoggerImplementation.checkState_(loggerState)) {
        loggerState.closed_ = true;
        if (!loggerState.fileStream_) {
          fulfill();
        } else {
          loggerState.fileStream_.end(fulfill);
        }
      } else {
        reject('Either not initialized, or already closed');
      }
    });
  }

  static createTimestamp_() {
    try {
      let now = new Date();
      let year = now.getFullYear().toString();
      let month = (now.getMonth() + 1).toString();
      let day = now.getDate().toString();
      let hour = now.getHours().toString();
      let minute = now.getMinutes().toString();
      let second = now.getSeconds().toString();
      hour = LoggerImplementation.addPrecedingZero_(hour);
      minute = LoggerImplementation.addPrecedingZero_(minute);
      second = LoggerImplementation.addPrecedingZero_(second);
      return '[' + month + '/' + day + '/' + year + ' ' + hour + ':' + minute + ':' + second + ']';
    } catch (err) {
      console.warn('Failed to create timestamp. Err: ' + err);
      return '';
    }
  }

  static addPrecedingZero_(timeString) {
    if (timeString.length === 1) {
      return '0' + timeString;
    }
    return timeString;
  }

  static checkState_(loggerState) {
    if (loggerState.logToFile_ === undefined) {
      console.warn('Must call Logger.initialize() before using the logger.');
      return false;
    }

    if (loggerState.closed_) {
      console.warn('The logger has been closed. Someone is trying to log to use it anyway.');
      return false;
    }

    return true;
  }
}

module.exports = LoggerImplementation;
