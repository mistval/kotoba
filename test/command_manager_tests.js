const CommandManager = require('./../core/command_manager.js');
const MockLogger = require('./mock_objects/mock_logger.js');
const MockMessage = require('./mock_objects/mock_message.js');
const assert = require('assert');
const MockConfig = require('./mock_objects/mock_config.js');

const config = new MockConfig('Server Admin', ['bot-admin-id']);
const MsgAboutCommand = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'bot!about suffix');
const MsgHelpCommand = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'bot!help');

describe('CommandManager', function() {
  describe('Load', function() {
    it('Refuses to load the command and complains in the logger if there is a bad command', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(__dirname + '/mock_commands/invalid_and_valid', null, logger, MockConfig);
      return commandManager.load(undefined, MockConfig).then(() => {
        assert(logger.failed === true);
        let invokeResult = commandManager.processInput(null, MsgHelpCommand, config);
        assert(invokeResult === false);
      });
    });
    it('Loads good commands even if it encounters a bad one', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(__dirname + '/mock_commands/invalid_and_valid', null, logger, MockConfig);
      return commandManager.load(undefined, MockConfig).then(() => {
        let invokeResult = commandManager.processInput(null, MsgAboutCommand, config);
        assert(invokeResult === true);
      });
    });
    it('Refuses to load command and complains if two commands have save uniqueId', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(__dirname + '/mock_commands/duplicate_unique_ids', null, logger, MockConfig);
      return commandManager.load(undefined, MockConfig).then(() => {
        let invokeResult1 = commandManager.processInput(null, MsgAboutCommand, config);
        let invokeResult2 = commandManager.processInput(null, MsgHelpCommand, config);
        assert(logger.failed === true);
        assert((invokeResult1 === true && invokeResult2 === false) || (invokeResult1 === false && invokeResult2 === true));
      });
    });
    it('Refuses to load command and complains if two commands have the same alias', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(__dirname + '/mock_commands/duplicate_aliases', null, logger, MockConfig);
      return commandManager.load(undefined, MockConfig).then(() => {
        let invokeResult1 = commandManager.processInput(null, MsgAboutCommand, config);
        let invokeResult2 = commandManager.processInput(null, MsgHelpCommand, config);
        assert(logger.failed === true);
        assert((invokeResult1 === true && invokeResult2 === false) || (invokeResult1 === false && invokeResult2 === true));
      });
    });
    it('Errors trying to load commands from nonexistent directory', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(__dirname + '/nonexistent_directory', null, logger, MockConfig);
      return commandManager.load(undefined, MockConfig).then(() => {
        assert(logger.failed === true);
      });
    });
    it('Gracefully handles command that throws', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(__dirname + '/mock_commands/valid_throws', null, logger, MockConfig);
      return commandManager.load(undefined, MockConfig).then(() => {
        commandManager.processInput(null, MsgAboutCommand, config);
        assert(logger.failed === true);
      });
    });
  });
});

