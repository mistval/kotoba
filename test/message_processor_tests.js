const MessageProcessor = require('./../core/message_processor.js');
const assert = require('assert');
const MockMessage = require('./mock_objects/mock_message.js');
const MockConfig = require('./mock_objects/mock_config.js');

const config = new MockConfig('Server Admin', ['bot-admin-id']);
const Msg = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'a message');

const NoNameData = {
  action(bot, msg) {
  },
};

const NoActionData = {
  name: 'MessageProcessor',
};

const ValidData = {
  name: 'Name',
  action(bot, msg) {
    this.invoked = true;
    return true;
  },
};

describe('MessageProcessor', function() {
  describe('constructor()', function() {
    it('Throws for invalid processor data', function() {
      assert.throws(() => new MessageProcessor());
      assert.throws(() => new MessageProcessor(NoNameData));
      assert.throws(() => new MessageProcessor(NoActionData));
    });
    it('Invokes on input', function() {
      let messageProcessor = new MessageProcessor(ValidData);
      let result = messageProcessor.handle(null, Msg, config);
      assert(result === true && messageProcessor.invoked === true);
    });
  });
});
