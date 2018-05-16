const reload = require('require-reload')(require);

const { PublicError } = reload('monochrome-bot');

let heapDump;
try {
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
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
  hidden: true,
  action(erisBot, monochrome, msg, suffix) {
    if (!heapDump) {
      throw PublicError.createWithCustomPublicMessage('Module \'heapdump\' not found. Did you install dev dependencies?', false, 'No heapdump module');
    }

    let outputFile;

    if (suffix) {
      outputFile = `${suffix}.heapsnapshot`;
    }

    heapDump.writeSnapshot(outputFile, (err, filename) => {
      if (err) {
        msg.channel.createMessage(`Error creating heap dump: ${err}`);
      } else {
        msg.channel.createMessage(`Heap dump written to file: ${filename}. You can inspect it with Chrome developer tools.`);
      }
    });
  },
};
