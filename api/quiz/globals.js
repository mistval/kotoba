const path = require('path');
const { initializeResourceDatabase } = require('kotoba-node-common');

class Logger {
  logFailure(title, message, err) {
    console.warn(`Error:: ${title} :: ${message}`);
    console.warn(err);
  }

  logSuccess(title, message) {
    console.log(`${title} :: ${message}`);
  }
}

const databasePath = path.join(__dirname, '..', 'generated', 'resources.dat');
const resourceDatabase = initializeResourceDatabase(databasePath);

module.exports = {
  logger: new Logger(),
  resourceDatabase,
};
