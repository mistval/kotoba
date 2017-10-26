'use strict'
/**
* Utils for helping with commands.
*/
class CommandUtils {
  /**
  * Don't construct me
  */
  constructor() {
    throw new Error();
  }

  /**
  * Search a list of commands for one with a given alias.
  * @param {String} alias - The alias to search for.
  * @param {Array<Command>} commands - The commands to search for the alias.
  * @returns {(Command|undefined)} Returns a Command if one is found, otherwise returns undefined.
  */
  static getCommandWithAlias(alias, commands) {
    for (let i = 0; i < commands.length; ++i) {
      let command = commands[i];
      if (command.aliases.indexOf(alias) !== -1) {
        return command;
      }
    }
  }
}

module.exports = CommandUtils;
