
const reload = require('require-reload')(require);

const PublicError = reload('monochrome-bot').PublicError;

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
  shortDescription: 'Dump a snapshot of the heap to the disk, for debugging purposes.',
  usageExample: '}dumpheap outputfilename',
  action(bot, msg, suffix) {
    if (!heapDump) {
      throw PublicError.createWithCustomPublicMessage('Module \'heapdump\' not found. Did you install dev dependencies?', false, 'No heapdump module');
    }
    if (!suffix) {
      suffix = undefined;
    } else {
      suffix += '.heapsnapshot';
    }
    heapDump.writeSnapshot(suffix, (err, filename) => {
      if (err) {
        msg.channel.createMessage(`Error creating heap dump: ${err}`);
      } else {
        msg.channel.createMessage(`Heap dump written to file: ${filename}. You can inspect it with Chrome developer tools.`);
      }
    });
  },
};
