'use strict'
const reload = require('require-reload')(require);
const Command = reload('./command.js');
const AllowCommand = reload('./commands/allow_command.js');
const UnrestrictCommand = reload('./commands/unrestrict_command.js');
const BanCommand = reload('./commands/ban_command.js');
const FileSystemUtils = reload('./util/file_system_utils.js');
const ReloadCommand = reload('./commands/reload.js');

/**
* Loads and executes commands in response to user input.
* @param {function} [reloadAction] - A lambda for the reload command to call to execute a reload.
*/
class CommandManager {
  /**
  * @param {String} directory - The directory from which to load commands.
  * @param {Function} reloadAction - The function that the reload command should invoke to initiate a reload.
  * @param {Logger} logger - The logger to log to.
  */
  constructor(directory, reloadAction, logger) {
    this.commands_ = [];
    this.reloadAction_ = reloadAction;
    this.logger_ = logger;
    this.directory_ = directory;
  }

  /**
  * Loads commands. Can be called to reload commands.
  */
  load() {
    const loggerTitle = 'COMMAND MANAGER';
    const FailedToLoadMessageStart = 'Failed to load command from file: ';
    this.commands_ = [];
    return FileSystemUtils.getFilesInDirectory(this.directory_).then((commandFiles) => {
      for (let commandFile of commandFiles) {
        let command;

        try {
          let commandInformation = reload(commandFile);
          command = new Command(commandInformation);
        } catch (e) {
          this.logger_.logFailure(loggerTitle, FailedToLoadMessageStart + commandFile, e);
          continue;
        }

        if (command.uniqueId && this.commands_.find(cmd => cmd.uniqueId === command.uniqueId)) {
          this.logger_.logFailure(loggerTitle, FailedToLoadMessageStart + commandFile + '. Error: uniqueId: ' + command.uniqueId + ' not unique');
          continue;
        }

        let duplicateAlias = this.getDuplicateAlias_(command, this.commands_);
        if (duplicateAlias) {
          this.logger_.logFailure(loggerTitle, FailedToLoadMessageStart + commandFile + '. Error: alias: ' + duplicateAlias + ' is not unique');
          continue;
        }
        this.commands_.push(command);
      }

      let userCommands = this.commands_.slice();
      this.commands_.push(new Command(new AllowCommand(userCommands)));
      this.commands_.push(new Command(new UnrestrictCommand(userCommands)));
      this.commands_.push(new Command(new BanCommand(userCommands)));

      if (this.reloadAction_) {
        this.commands_.push(new Command(new ReloadCommand(this.reloadAction_)));
      }
    }).catch(err => {
      this.logger_.logFailure(loggerTitle, 'Error loading commands.', err);
    });
  }

  /**
  * Tries to process user input as a command.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {Eris.Message} msg - The msg to process.
  * @param {Object} config - The monochrome configuration.
  * @returns {Boolean} True if the input is processed as a command, false otherwise.
  *   Note: this returning true does not mean that a command was necessarily successful. It only means that the input was handed to a command to process.
  */
  processInput(bot, msg, config) {
    const loggerTitle = 'COMMAND';
    let msgContent = msg.content.replace('\u3000', ' ');
    let spaceIndex = msgContent.indexOf(' ');
    let commandText = '';
    if (spaceIndex === -1) {
      commandText = msgContent;
    } else {
      commandText = msgContent.substring(0, spaceIndex);
    }
    commandText = commandText.toLowerCase();

    for (let command of this.commands_) {
      if (command.aliases.indexOf(commandText) !== -1) {
        let suffix = '';
        if (spaceIndex !== -1) {
          suffix = msgContent.substring(spaceIndex + 1, msgContent.length).trim();
        }
        try {
          Promise.resolve(command.handle(bot, msg, suffix, config)).then(result => {
            let success = typeof result !== typeof '';
            this.logger_.logInputReaction(loggerTitle, msg, '', success, result);
          }).catch(err => {
            if (err.publicMessage) {
              msg.channel.createMessage(err.publicMessage);
            } else if (config.genericErrorMessage) {
              msg.channel.createMessage(config.genericErrorMessage);
            }
            this.logger_.logInputReaction(loggerTitle, msg, '', false, 'Promise rejection');
            this.logger_.logFailure(loggerTitle, 'Command \'' + msgContent + '\' returned a promise that rejected.', err);
          });
        } catch (err) {
          this.logger_.logInputReaction(loggerTitle, msg, '', false, 'Threw exception');
          this.logger_.logFailure(loggerTitle, 'Command \'' + msgContent + '\' threw an exception.', err);
          if (config.genericErrorMessage) {
            msg.channel.createMessage(config.genericErrorMessage);
          }
        }

        return true;
      }
    }

    return false;
  }

  getDuplicateAlias_(command, otherCommands) {
    for (let alias of command.aliases) {
      if (otherCommands.find(cmd => cmd.aliases.indexOf(alias) !== -1)) {
        return alias;
      }
    }
  }
}

module.exports = CommandManager;
