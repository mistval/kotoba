'use strict'
let heapDump;
try {
  heapDump = require('heapdump');
} catch (err) {
  // It's just a dev tool
}

/**
* Write a heap dump to disk.
*/
module.exports = {
  commandAliases: ['}dumpheap'],
  botAdminOnly: true,
  action(bot, msg, suffix) {
    if (!heapDump) {
      msg.channel.createMessage('Module \'heapdump\' not found. Did you install dev dependencies?');
      return 'No heapdump module';
    }
    if (!suffix) {
      suffix = undefined;
    }
    heapDump.writeSnapshot(suffix, (err, filename) => {
      if (err) {
        msg.channel.createMessage('Error creating heap dump: ' + err);
      } else {
        msg.channel.createMessage('Heap dump written to file: ' + filename + '. You can inspect it with Chrome developer tools.');
      }
    });
  },
};
